const { button } = require("../toolkit/skeleton")

/**
 * Class representing signup page in Welcome module.
 * @class __welcome_signup
 * @extends __welcome_interact
 */
require('./skin');
class signin_router extends LetcBox {

  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this.mset({ flow: _a.y });
    this._step = parseInt(localStorage.signup_step) || 0;
    this._max_step = 1;
    try {
      LOCALE.extend(require("../../locale")('en'));
    } catch (e) {
      LOCALE = { ...LOCALE, ...require("../../locale")(Visitor.language()) }
    }
  }

  /** */
  loadWidget(pace = 0) {
    let opt = { uiHandler: [this], kind: "signin_form", email: this.mget(_a.email) }
    this._step = this._step + pace;
    if (this._step > this._max_step) this._step = this._max_step;
    if (this._step < 0) this._step = 0;
    switch (this._step) {
      case 0:
        opt.kind = "signin_form";
        break;
      case 1:
        opt.kind = "signup_otp";
        break;
    }
    this.feed(opt);
  }

  /**
    *
    */
  async onDomRefresh() {
    if (Visitor.get('connection') == 'otp') {
      let { email } = Visitor.profile()
      await Kind.waitFor('dtk_otp');
      this.feed({
        payload: {
          uid: Visitor.id,
          id: Visitor.id,
          secret: Visitor.get('otp_key'),
          email,
          method: 'otp'
        },
        kind: 'dtk_otp',
        api: SERVICE.yp.login_top,
        email,
        title: "Multi factor athentication",
        message: "We have sent a code to {0} validate you connection".format(email),
        resendService: 'resend-signin-otp',
        service: 'otp-signined'
      });
      this._otp = this.children.last()
      return
    }
    let { main_domain, protocol, endpoint } = bootstrap()
    if (!Visitor.isOnline() && location.host != main_domain) {
      location.href = `${protocol}://${main_domain}${endpoint}#/welcome/signin`
      return
    }
    location.hash = "#/welcome/signin"
    this.feed({ kind: 'signin_form' });
  }

  /**
  * To avoid full page reload upon login 
  */
  gotSignedIn(data) {
    let { user, organization, hub } = data;
    if (user) {
      Visitor.set(user);
    }
    if (organization) {
      Organization.set(organization);
    }
    if (hub) {
      Host.set(hub);
    }

    wsRouter.restart(1);
    Drumee.start();
    setTimeout(() => {
      if (typeof Wm === 'undefined') location.reload();
    }, 1500);
  }

  /**
   * Host-driven OTP resend, delegated from the dtk_otp widget via its
   * `resendService`. The widget itself only fires the service (it does no
   * network work when `resendService` is set), so we own the request here —
   * which lets us show a loading state on the card while otp.send is in
   * flight. On success we swap in the fresh secret and clear the digit boxes
   * for re-entry; on failure we surface the error in the widget's tips line.
   */
  _resendSigninOtp() {
    const otp = this._otp;
    if (!otp || this._resending) return;
    this._resending = true;
    // The router skin renders a spinner on the resend link while this is set.
    if (otp.el) otp.el.dataset.resending = '1';

    const payload = otp.mget('payload') || {};
    const { email, method } = payload;
    const api = otp.mget('resendApi') || SERVICE.otp.send;
    this.postService(api, { email, method }).then((data) => {
      // Merge (not replace) so id/uid/method survive; overlay the new secret.
      otp.mset({ payload: { ...payload, ...data } });
      // Wipe the boxes so checkForm doesn't immediately resubmit the old code.
      otp.ensurePart('digits').then((p) => {
        const boxes = p.children.toArray();
        for (const c of boxes) {
          if (typeof c.setValue === 'function') c.setValue('');
        }
        if (boxes[0] && typeof boxes[0].focus === 'function') boxes[0].focus();
      });
      if (typeof otp.displayMessage === 'function') {
        const msg = LOCALE.NEW_CODE_RESENT ||
          "We have sent a new code to {0}".format(email);
        otp.displayMessage(msg);
      }
    }).catch((e) => {
      this.warn("Resend signin OTP failed", e);
      if (typeof otp.displayMessage === 'function') {
        otp.displayMessage(LOCALE.UNKNOWN_ERROR, 1);
      }
    }).finally(() => {
      this._resending = false;
      if (otp.el) otp.el.dataset.resending = '0';
    });
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   */
  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    this.debug("AAA:97", cmd, service, args, this)
    let buttons;
    let { error, data } = args;
    switch (service) {
      case "password-set":
        if (!error) {
          this.gotSignedIn(data)
        } else {
          this.cmd((error.message || LOCALE.UNKNOWN_ERROR), _a.error);
        }
        break;
      case "onboarding":
        let kind = "onboarding";
        let name = "onboarding";
        setTimeout(() => {
          location.reload()
        }, 1000)
        // Kind.loadPlugin({ name, kind }).then((widget) => {
        //   if (!widget) {
        //     return location.reload()
        //   }
        //   Kind.waitFor(kind).then((k) => {
        //     this.feed({ ...args, kind, type: "app", service: "onboarding-complete" })
        //   })
        // }).catch((e) => {
        //   this.warn(`Failed to load onboarding plugin`, e)
        //   location.reload()
        // })
        // location.reload() // TMP FIX
        break;

      case 'onboarding-complete':
        buttons = [
          button(this, {
            label: LOCALE.GO_TO_DRUMEEOS,
            service: 'login',
            ico: "arrow-right",
            type: _a.row,
            priority: "primary"
          }),
        ]
        this.feed({ buttons, kind: 'dtk_dialog', title: LOCALE.SIGNUP_COMPLETED, message: LOCALE.DRUMEEOS_IS_NOW_READY })
        break;

      case 'login':
        return location.reload();

      case 'otp-failed':
        return this.feed({ kind: 'dtk_otp', api: SERVICE.otp.verify, service: 'otp-verified' });

      case 'otp-verified':
        if (!data || !data.secret) {
          return
        }
        this.feed({
          kind: 'dtk_dialog',
          body: {
            kind: 'dtk_pwsetter',
            sys_pn: 'pwsetter',
            uiHandler: [this],
            label: LOCALE.RESET_PASSWORD,
            api: SERVICE.otp.set_password,
            payload: data,
            service: 'password-set'
          },
          message: '',
          title: LOCALE.SET_NEW_PASSWORD,
        });
        return
      case 'verify-signin-otp':
        if (!data || !data.secret) {
          return
        }
        await Kind.waitFor('dtk_otp');
        this.feed({
          payload: { id: data.id, uid: data.id, email: data.email, method: "otp", secret: data.secret },
          kind: 'dtk_otp',
          api: SERVICE.yp.login_top,
          title: "Multi factor athentication",
          message: "We have sent a code to {0} validate you connection".format(args.data.email),
          resendService: 'resend-signin-otp',
          service: 'otp-signined'
        });
        this._otp = this.children.last()
        return
      case 'resend-signin-otp':
        this._resendSigninOtp();
        return;

      case 'otp-signined':
        location.reload();
        return;

      case 'new-code':
        if (data.secret) Visitor.set({
          ...data,
          otp_key: data.secret,
        });
        return;
      case 'otp-sent':
        await Kind.waitFor('dtk_otp');
        this.feed({
          payload: args.data,
          kind: 'dtk_otp',
          api: SERVICE.otp.verify,
          title: LOCALE.Q_FORGOT_PASSWORD,
          message: LOCALE.WE_HAVE_SENT_CODE.format(args.data.email),
          service: 'otp-verified'
        });
        this._otp = this.children.last()
        return

      case _a.error:
        buttons = [
          button(this, {
            label: LOCALE.BACK,
            service: _a.home,
            ico: "arrow-right",
            type: _a.row,
            priority: "secondary"
          }),
        ]
        this.feed({ message: args.message, buttons, kind: 'dtk_dialog', service: _a.home, title: "Ooop!" })
        break;

      case _a.home:
        this.feed({ kind: 'signin_form' });
        break;
    }
  }
}

module.exports = signin_router
