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
    // this.feed({
    //   kind: 'dtk_dialog',
    //   body: { kind: 'dtk_pwsetter', sys_pn: 'pwsetter', label: LOCALE.RESET_PASSWORD },
    //   message: '',
    //   title: LOCALE.SET_NEW_PASSWORD,
    //   service: 'otp-verified'
    // });
    this.feed({ kind: 'signin_form' });
  }


  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    this.debug("AAA:64zz", service, args, this)
    let buttons;
    switch (service) {
      case _a.next:
        let { data } = args;
        this.mset(data)
        this.loadWidget(1)
        break;

      case "onboarding":
        this.feed({ ...args, kind: "onboarding", type: "app", service: "onboarding-complete" })
        break;

      case "onboarding":
        this.feed({ ...args, kind: "onboarding", type: "app", service: "onboarding-complete" })
        break;

      case "user_exists":
        buttons = [
          button(this, {
            label: LOCALE.BACK,
            service: _a.back,
            ico: "arrow-right",
            type: _a.row,
            priority: "secondary"
          }),
          button(this, {
            label: LOCALE.LOGIN_PERSONAL_ACCOUNT,
            service: 'login',
            ico: "arrow-right",
            type: _a.row,
            priority: "primary"
          }),
        ]
        this.feed({ message: args.message, buttons, kind: 'signin_message', title: "Ooop!" })
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
        this.feed({ buttons, kind: 'signin_message', title: LOCALE.SIGNUP_COMPLETED, message: LOCALE.DRUMEEOS_IS_NOW_READY })
        break;

      case 'onboarding':
        this.debug("AAA", { email: this.mget(_a.email) })
        this.feed({ kind: 'onboarding', email: this.mget(_a.email), uiHandler: [this], type: 'app', service: "signup-completed" })
        break;

      case 'login':
        return location.reload();

      case 'otp-failed':
        this.debug("AAA", args)
        return this.feed({ kind: 'signin_otp', api: SERVICE.otp.verify, service: 'otp-verified' });

      case 'otp-verified':
        this.debug("AAA:126", args)
        this.feed({
          kind: 'dtk_dialog',
          body: {
            kind: 'dtk_pwsetter',
            sys_pn: 'pwsetter',
            label: LOCALE.RESET_PASSWORD,
            api: SERVICE.otp.set_password,
            payload: args.data
          },
          message: '',
          title: LOCALE.SET_NEW_PASSWORD,
          service: 'password-set'
        });
        return
      // return this.feed({
      //   kind: 'dtk_dialog',
      //   body: { kind: 'dtk_pwsetter', sys_pn: 'pwsetter' },
      //   buttons: button(this, {
      //     label: LOCALE.RESET_PASSWORD,
      //     service: 'password-reset',
      //     type: _a.email,
      //     sys_pn: "commit-button",
      //     haptic: 2000
      //   }),
      //   message: '',
      //   title: LOCALE.SET_NEW_PASSWOR,
      //   service: 'otp-verified'
      // });

      case 'otp-sent':
        this.debug("AAA:119", args)
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
            service: _a.back,
            ico: "arrow-right",
            type: _a.row,
            priority: "secondary"
          }),
        ]
        this.feed({ message: args.message, buttons, kind: 'signin_message', title: "Ooop!" })
        break;

    }
  }
}

module.exports = signin_router
