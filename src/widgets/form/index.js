
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
    if (this.mget(RECONNECT)) {
      RADIO_BROADCAST.trigger("user:signed:in", RECONNECT);
      this.suppress();
      Butler.sleep()
      return;
    }

    Drumee.start();
    setTimeout(() => {
      if (typeof Wm === 'undefined') location.reload();
    }, 3000);
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
    switch (data.status) {
      case "INCOMPLETE_SIGNUP":
        this.triggerHandlers({ service: "onboarding" })
        return
      case "BLOCKED":
      case "ARCHIVED":
        return this.renderMessage(LOCALE.BLOCKED_ACCOUNT);

      case "ok":
        let { onboarded, email, firstname, lastname } = data.user.profile;
        if (!onboarded && !firstname && !lastname) {
          return this.triggerHandlers({ ...data, email, service: "onboarding" })
        }
      case "ALREADY_SIGNED_IN":
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

    this.gotSignedIn(data);
  }

  /**
   * 
   * @returns 
   */
  commitForm() {
    let { username, password } = this.getData();
    if (!username) {
      this.setItemStatus(_a.username, "error");
      this.setItemStatus('commit-button', "0", "haptic");
      return
    }
    if (!password || !password.length) {
      this.setItemStatus(_a.password, "error");
      this.setItemStatus('commit-button', "0", "haptic");
      return
    }
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
    switch (service) {
      case _a.input:
        if (![_e.commit, _e.Enter].includes(status)) break;
      case 'signin':
        this.commitForm();
        break;
      case 'reset-password':
        this.debug("AAA:88 Navigating to reset password", this.getData())
        let { username } = this.getData();
        if (!username || !username.isEmail()) {
          this.setItemStatus(_a.username, _a.error, _a.status)
        } else {
          this.setItemStatus(_a.username, "", _a.status);
          this.postService(SERVICE.otp.send, { email: username }).then((data) => {
            this.debug("AAA:97 OTP sent", data)
            if (data.sent) {
              this.triggerHandlers({ data, service: 'otp-sent' })
            } else {
              this.renderMessage(LOCALE.OOPS_EMAIL_NOT_FOUND, 3000);
            }
          }).catch((e) => {
            this.warn("AAA:104 Error sending OTP", e)
          })
        }
        break;
      case 'use-apple':
        this.debug(`POSTING = ${service}`, args, status, cmd);
        this.postService(SERVICE.apple.initiate, {}).then((data) => {
          this._handleResponse(data);
          document.onvisibilitychange = () => {
            location.reload()
          }
        })
        break;
      case 'use-google':
        this.debug(`POSTING = ${service}`, args, status, cmd);
        this.postService(SERVICE.google.initiate, {}).then((data) => {
          this._handleResponse(data);
          document.onvisibilitychange = () => {
            location.reload()
          }
        })
        break;

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
  renderMessage(content, timeout = 0) {
    this.ensurePart(_a.message).then((p) => {
      p.set({ content })
    })
    if (timeout > 0) {
      setTimeout(() => {
        this.ensurePart(_a.message).then((p) => {
          p.set({ content: "" })
        })
      }, timeout);
    }
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
