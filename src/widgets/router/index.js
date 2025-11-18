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
    LOCALE = { ...LOCALE, ...require("../../locale")(Visitor.language()) }
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
  onDomRefresh() {
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
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    this.debug("AAA:64zz", cmd, service, args, this)
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
        Kind.loadPlugin({ name, kind }).then(() => {
          Kind.waitFor(kind).then((k) => {
            this.feed({ ...args, kind, type: "app", service: "onboarding-complete" })
          })
        }).catch((e) => {
          this.warn(`Failed to load onboarding plugin`, e)
        })
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
        this.feed({ buttons, kind: 'dtk_message', title: LOCALE.SIGNUP_COMPLETED, message: LOCALE.DRUMEEOS_IS_NOW_READY })
        break;

      case 'onboarding':
        this.feed({ kind: 'onboarding', email: this.mget(_a.email), uiHandler: [this], type: 'app', service: "signup-completed" })
        break;

      case 'login':
        return location.reload();

      case 'otp-failed':
        return this.feed({ kind: 'dtk_otp', api: SERVICE.otp.verify, service: 'otp-verified' });

      case 'otp-verified':
        this.debug("AAA:121", data)
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
        this.feed({ message: args.message, buttons, kind: 'dtk_message', service: _a.home, title: "Ooop!" })
        break;

      case _a.home:
        this.feed({ kind: 'signin_form' });
        break;
    }
  }
}

module.exports = signin_router
