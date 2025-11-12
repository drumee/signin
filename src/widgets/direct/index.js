
/**
 * Class representing signup page in Welcome module.
 * @class __welcome_signup
 * @extends __welcome_interact
 */
const Signup = require("..")
require('./skin');

class signup_direct extends Signup {

  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    super.initialize(opt);
    this._secret = this.mget(_a.secret) || ''
    this._type = '';
    this._method = {};
    this.declareHandlers();
    this.mset({ flow: _a.y })
  }

  /**
   *
  */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }


  /**
   * 
   * @returns 
   */
  commitForm() {
    let { email } = this.getData();
    if (!email || !email.isEmail()) {
      this.setItemStatus(_a.email, "error");
      return
    }
    this.setItemStatus('commit-button', "1", "haptic");
    this.postService(SERVICE.signup.save_info, { email }).then((data) => {
      this.debug("AAA:49", data)
      if (data.status == _a.ok) {
        this.triggerHandlers({ data, service: _a.next })
      } else {
        let message = data.status;
        switch (data.status) {
          case 'user_exists':
            message = LOCALE.ALREADY_EXISTS.format(email);
            break
        }
        this.triggerHandlers({ ...data, message, service: "signup-error" })
      }
    }).catch(() => {
      this.triggerHandlers({ service: "signup-error" })
    })
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    let status = cmd.status;
    this.debug(`onUiEvent xx 69 service = ${service}`, args, status, cmd);
    switch (service) {
      case _a.input:
        if (status != _e.Enter) break;
      case 'use-email':
        this.commitForm();
        break;
      case 'use-google':
        this.debug(`POSTING = ${service}`, args, status, cmd);
        this.postService(SERVICE.register.google_start, {}).then((data) => {
          this._handleResponse(data)
        })
        break;
      case 'use-apple':
        this.debug(`POSTING = ${service}`, args, status, cmd);
        this.postService(SERVICE.register.apple_start, {}).then((data) => {
          this._handleResponse(data)
        })
        break;
      default:
        this.debug("Created by kind builder");
    }
  }


  /**
   *
  */
  loadTermsAndConditions() {
    Welcome.getPart('wrapper-modal').feed(require('./skeleton/terms-and-conditions').default(this))
    return
  }

  /**
   *
  */
  downloadTermsAndConditions() {
    this.debug('downloadTermsAndConditions', this)
    return
  }

  /**
   *
  */
  async acceptConditions(cmd, args) {
    const checkBox = await this.ensurePart('conditions-checkbox')
    const button = await this.ensurePart('button-confirm');
    const wrapper = Welcome.getPart('wrapper-modal')
    if (cmd.mget(_a.sys_pn) == 'conditions') {
      checkBox.setState(1)
      wrapper.softClear()
    }
    button.setState(checkBox.mget(_a.state))
  }

  /**
   *
  */
  async declineConditions() {
    const checkBox = await this.ensurePart('conditions-checkbox')
    const button = await this.ensurePart('button-confirm');
    const wrapper = Welcome.getPart('wrapper-modal')
    button.el.dataset.confirm = checkBox.mget(_a.state)
    checkBox.setState(0)
    button.setState(checkBox.mget(_a.state))
    wrapper.softClear()
  }

  /**
   * 
   * @param {*} data 
   */
  _handleResponse(data) {
    this.debug("AAA:_handleResponse", data)
    switch (data.status) {
      case "user_exists":
        return this.renderMessage(data.status, `${LOCALE.EMAIL_ALREADY_EXISTS} (${data.email})`)
      case "not_bound":
        Butler.once("close-content", () => {
          uiRouter.ensureWebsocket().then((e) => {
            this.directSignup()
          })
        })
        return Butler.say(LOCALE.NOT_A_BOT)
      case "server_busy":
        return Butler.say(LOCALE.SERVER_BUSY)
      case _a.ok:
        location.reload();
        return
      case "prompt":
        if (data.authUrl) {
          window.open(data.authUrl, "_blank");
        }
        break;
      default:
        return this.renderMessage(_a.error, data.message || LOCALE.TRY_AGAIN_LATER)
    }
  }

  /**
   *
  */
  async directSignup(cmd, args) {
    let { email, password } = this.getData();

    let we = await this.ensurePart("wrapper-email")
    if (!email.isEmail()) {
      we.el.dataset.status = "error"
      return
    }
    we.el.dataset.status = ""
    let rp = await this.ensurePart('wrapper-pw')
    if (password.length < 8) {
      rp.el.dataset.status = "error"
      return
    }
    rp.el.dataset.status = ""
    this.postService(SERVICE.butler.signup, this.getData()).then((data) => {
      this._handleResponse(data)
    }).catch((e) => {
      this.warn("directSignup: caugth error", e)
    })
  }

  /**
   *
  */
  renderMessage(message) {
    this.triggerHandlers({ service: _a.error, message })
    // this.debug('renderMessage', msg, this)
    // const msgBox = Skeletons.Note({
    //   className: `${this.fig.family}__note error-msg`,
    //   content: msg
    // })

    // if (!this.__buttonWrapper || !this.__buttonWrapper) return;
    // this.__buttonWrapper.el.dataset.mode = _a.closed;
    // this.__messageBox.el.dataset.mode = _a.open;
    // this.__messageBox.feed(msgBox);

    // const f = () => {
    //   this.__messageBox.el.dataset.mode = _a.closed
    //   this.__messageBox.clear()
    //   this.__buttonWrapper.el.dataset.mode = _a.open
    // }
    // return _.delay(f, Visitor.timeout(3000))
  }


  /**
   * @param {string} code
  */
  handleError(code) {
    switch (code) {
      case 'IDENT_NOT_AVAILABLE':
        this.renderMessage(LOCALE.DOMAIN_ALREADY_EXISTS);
        return;
      case 'INVALID_IDENT':
        this.renderMessage(LOCALE.REQUIRE_IDENT);
        return;
      default:
        this.renderMessage(LOCALE.SOMETHING_WENT_WRONG + ` (${code})`);
    }
  }

}

module.exports = signup_direct
