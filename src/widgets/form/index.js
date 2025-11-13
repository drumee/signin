
/**
 * Class representing signup page in Welcome module.
 * @class __welcome_signup
 * @extends __welcome_interact
 */
const Signup = require("..")
require('./skin');
const RECONNECT = 'reconnect';

class signin_form extends Signup {

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
  * To avoid full page reload upon login 
  */
  gotSignedIn() {
    if (Visitor.isOnline()) {
      this.anim([1, { alpha: 0.0 }]);
      RADIO_BROADCAST.trigger("user:signed:in", this.mget('reconnect'));
    } else {
      Drumee.start()
    }
  }

  /**
   *
  */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

  /**
   * 
   * @param {*} data 
   */
  checkLoginStatus(data) {
    setTimeout(() => {
      this.setItemStatus('commit-button', "0", "haptic");
    }, 500)
    this.debug("AAA:52", data)
    switch (data.status) {
      case "INCOMPLETE_SIGNUP":
        this.triggerHandlers({ service: "onboarding" })
        return
      case "BLOCKED":
      case "ARCHIVED":
        return this.renderMessage(LOCALE.BLOCKED_ACCOUNT);

      case "ok":
        let { onboarded, email } = data.user.profile;
        if (!onboarded) {
          return this.triggerHandlers({ email, service: "onboarding" })
        }
      case "ALREADY_SIGNED_IN":
        Visitor.set(data);
        if (this.mget(RECONNECT)) {
          RADIO_BROADCAST.trigger("user:signed:in", RECONNECT);
          wsRouter.restart(1);
          this.suppress();
          Butler.sleep()
          return;
        }
        return this.gotSignedIn(data);

      case "no_cookie":
        return this.retryLogin(data);

      case _a.frozen:
      case _a.locked:
        return this.renderMessage(LOCALE.ACCOUNT_HAS_BEEN_DELETED);

      case "CROSS_SIGNED_IN":
        this.triggerHandlers({ service: "cross-signed-in" })
        return;

      case "WRONG_CREDENTIALS":
        return this.renderMessage(LOCALE.CHECK_YOUR_MAIL);
      case "INVALID_SECRET":
      case "INVALID_CODE":
        return this.renderMessage(LOCALE.INVALID_CODE);
    }

    if (data.secret) {
      this.prompt_otp(data);
      return;
    }

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
    this.gotSignedIn(data);
  }

  /**
   * 
   * @returns 
   */
  commitForm() {
    let { username, password } = this.getData();
    this.debug("AAA:38", this.getData());
    if (!username) {
      this.setItemStatus(_a.username, "error");
      this.setItemStatus('commit-button', "0", "haptic");
      return
    }
    this.debug("AAA:44", { username, password }, (!password || !password.length))
    if (!password || !password.length) {
      this.setItemStatus(_a.password, "error");
      this.setItemStatus('commit-button', "0", "haptic");
      return
    }
    this.debug("AAA:47", { username, password }, (!password || !password.length))
    this.setItemStatus('commit-button', "1", "haptic");
    let vars = { username, password }
    this.postService(SERVICE.yp.signin, { vars }).then((data) => {
      this.checkLoginStatus(data)
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
      case 'signin':
        this.commitForm();
        break;
      // case 'use-google':
      //   this.debug(`POSTING = ${service}`, args, status, cmd);
      //   this.postService(SERVICE.register.google_start, {}).then((data) => {
      //     this._handleResponse(data)
      //   })
      //   break;
      // case 'use-apple':
      //   this.debug(`POSTING = ${service}`, args, status, cmd);
      //   this.postService(SERVICE.register.apple_start, {}).then((data) => {
      //     this._handleResponse(data)
      //   })
      //   break;
      // default:
      //   this.debug("Created by kind builder");
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
  renderMessage(content) {
    // this.triggerHandlers({ service: _a.error, message })
    this.ensurePart(_a.message).then((p) => {
      p.set({ content })
    })
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

module.exports = signin_form
