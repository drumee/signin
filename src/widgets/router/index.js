const { button } = require("../toolkit/skeleton")

/**
 * Class representing signup page in Welcome module.
 * @class __welcome_signup
 * @extends __welcome_interact
 */
require('./skin');
class signup_router extends LetcBox {

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
    this.fetchService(SERVICE.signup.get_info, {}).then((data) => {
      this.mset(data)
      this.feed({ ...data, kind: 'signin_form' });
      // if (data.otp) {
      //   this.loadWidget(1)
      // } else {
      //   this.loadWidget(0)
      // }
    }).catch(() => {
      this.loadWidget(0)
    })
  }


  /**
   * 
   * @param {*} cmd 
   * @param {*} args 
   */
  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    this.debug("AAA:64zz", service, this)
    let buttons;
    switch (service) {
      case _a.next:
        let { data } = args;
        this.mset(data)
        this.loadWidget(1)
        break;
      case "onboarding":
        this.feed({ kind: "onboarding" })
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
        this.feed({ message: args.message, buttons, kind: 'signup_message', title: "Ooop!" })
        break;

      case 'signup-completed':
        buttons = [
          button(this, {
            label: LOCALE.GO_TO_DRUMEEOS,
            service: 'login',
            ico: "arrow-right",
            type: _a.row,
            priority: "primary"
          }),
        ]
        this.feed({ buttons, kind: 'signup_message', title: LOCALE.SIGNUP_COMPLETED, message: LOCALE.DRUMEEOS_IS_NOW_READY })
        break;

      case 'onboarding':
        this.debug("AAA", { email: this.mget(_a.email) })
        this.feed({ kind: 'onboarding', email: this.mget(_a.email), uiHandler: [this], type: 'app', service: "signup-completed" })
        break;

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
        this.feed({ message: args.message, buttons, kind: 'signup_message', title: "Ooop!" })
        break;

    }
  }
}

module.exports = signup_router
