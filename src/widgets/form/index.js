
/**
 * Class representing signup page in Welcome module.
 * @class __welcome_signup
 * @extends __welcome_interact
 */
const Signup = require("..")
require('./skin');
const RECONNECT = 'reconnect';
// Resend cooldown for the check-inbox screen, in seconds.
const COOLDOWN_SEC = 20;

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
    this.showSignin();
  }

  /**
   * Render the sign-in view (default).
  */
  showSignin() {
    this.feed(require('./skeleton').default(this));
  }

  /**
   * Render the forgot-password view (email input + submit button).
  */
  showForgot() {
    this.feed(require('./skeleton/forgot').default(this));
  }

  /**
   * Render the check-inbox view (shown after a reset code is sent) and
   * start the resend cooldown.
  */
  showCheckInbox() {
    this.feed(require('./skeleton/check-inbox').default(this));
    this._startCooldown(COOLDOWN_SEC);
  }

  /**
   * Clean up the running cooldown timer.
  */
  onDestroy() {
    clearInterval(this._tick);
  }

  /**
   * Format seconds as mm:ss for the resend countdown.
   * @param {number} sec
  */
  _fmt(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /**
   * Put the resend button on cooldown for `seconds`: disable it and replace
   * its label with a live mm:ss countdown. `seconds <= 0` enables it at once.
   * @param {number} seconds
  */
  _startCooldown(seconds) {
    clearInterval(this._tick);
    if (!(seconds > 0)) {
      this._endCooldown();
      return;
    }
    this._counting = true;
    this.ensurePart('resend-button').then((b) => {
      b.el.dataset.counting = '1'; // hides the icon; the label shows the timer
      const label = b.el.querySelector('.btn');
      let remain = seconds;
      if (label) label.textContent = this._fmt(remain);
      this._tick = setInterval(() => {
        remain--;
        if (remain <= 0) {
          this._endCooldown();
          return;
        }
        if (label) label.textContent = this._fmt(remain);
      }, 1000);
    });
  }

  /**
   * End the cooldown: restore the resend button's label and re-enable it.
  */
  _endCooldown() {
    clearInterval(this._tick);
    this._counting = false;
    this.ensurePart('resend-button').then((b) => {
      const label = b.el.querySelector('.btn');
      if (label) label.textContent = LOCALE.RESEND_CODE || "Resend code";
      delete b.el.dataset.counting;
    });
  }

  /**
   * Validate the forgot-password form then send a reset code.
   * Validation: (1) value is a well-formed email, (2) the email is
   * registered in the database. Only then hand off to the OTP flow.
  */
  submitForgot() {
    let { username } = this.getData();
    username = (username || "").trim();

    // (1) Must be a valid email format.
    if (!username || !username.isEmail()) {
      this.setItemStatus(_a.username, _a.error, _a.status);
      this.setItemStatus('forgot-button', "0", "haptic");
      this.renderMessage(LOCALE.INVALID_EMAIL || "Please enter a valid email address", 3000);
      return;
    }
    this.setItemStatus(_a.username, "", _a.status);
    this.setItemStatus('forgot-button', "1", "haptic");

    // (2) Must exist in the database before we send a reset code.
    this.postService(SERVICE.yp.email_exists, { value: username }).then((res) => {
      if (!res || !res.id) {
        this.setItemStatus(_a.username, _a.error, _a.status);
        this.setItemStatus('forgot-button', "0", "haptic");
        this.renderMessage(LOCALE.OOPS_EMAIL_NOT_FOUND || "No account found with this email", 3000);
        return;
      }
      return this.postService(SERVICE.otp.send, { email: username }).then((data) => {
        this.setItemStatus('forgot-button', "0", "haptic");
        if (data.sent) {
          this.mset({ email: username });
          this.showCheckInbox();
        } else {
          this.setItemStatus(_a.username, _a.error, _a.status);
          this.renderMessage(LOCALE.OOPS_EMAIL_NOT_FOUND || "No account found with this email", 3000);
        }
      });
    }).catch((e) => {
      this.setItemStatus('forgot-button', "0", "haptic");
      this.warn("submitForgot: error validating/sending reset code", e);
    });
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
      case "EMAIL_NOT_VERIFIED": {
        // Account exists but its email hasn't been verified yet. The server
        // refused the session; send the user to the signup app's "Check your
        // inbox" screen (carrying the email) so they can click / resend the
        // verification link.
        const email = data.email || (this.getData() || {}).username || "";
        const q = email ? `?email=${encodeURIComponent(email)}&pending=1` : `?pending=1`;
        location.hash = `#/welcome/signup${q}`;
        return;
      }
      case "BLOCKED":
      case "ARCHIVED":
        return this.renderMessage(LOCALE.BLOCKED_ACCOUNT);

      case "ok":
        setTimeout(() => {
          location.reload()
        }, 1000)
        // let { onboarded, email, firstname, lastname } = data.user.profile;
        // if (!onboarded && !firstname && !lastname) {
        //   return this.triggerHandlers({ ...data, email, service: "onboarding" })
        // }
        return;
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
      this.triggerHandlers({ service: "verify-signin-otp", data })
      // this.prompt_otp(data);
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
    }).catch((e) => {
      this.warn("Caught server in commitForm", e)
      this.triggerHandlers({ service: "signin-error" })
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
      case "toggle-password-visibility": {
        const eyePart = cmd;
        const row = eyePart.el.closest('.signin-form__entry-row');
        if (!row) break;
        const input = row.querySelector('input');
        if (!input) break;
        const isVisible = input.type === 'text';
        input.type = isVisible ? 'password' : 'text';
        const useEl = eyePart.el.querySelector('svg use');
        if (useEl) {
          useEl.setAttribute('xlink:href', isVisible ? '#--icon-eye_closed' : '#--icon-eye');
        }
        eyePart.el.dataset.state = isVisible ? '0' : '1';
        break;
      }
      case _a.input:
        if (![_e.commit, _e.Enter].includes(status)) break;
      case 'signin':
        this.commitForm();
        break;
      case 'reset-password':
        this.showForgot();
        break;
      case 'forgot-input':
        if (![_e.commit, _e.Enter].includes(status)) break;
      case 'forgot-submit':
        this.submitForgot();
        break;
      case 'back-to-signin':
        this.showSignin();
        break;
      case 'resend-email':
        // Ignore clicks while the cooldown is running.
        if (this._counting) break;
        this.setItemStatus('resend-button', "1", "haptic"); // loading spinner
        this.postService(SERVICE.otp.send, { email: this.mget(_a.email) || "" }).then((data) => {
          this.setItemStatus('resend-button', "0", "haptic");
          if (data && data.sent) {
            this._startCooldown(COOLDOWN_SEC);
          } else {
            this.renderMessage(LOCALE.OOPS_EMAIL_NOT_FOUND || "No account found with this email", 3000);
          }
        }).catch((e) => {
          this.setItemStatus('resend-button', "0", "haptic");
          this.warn("resend-email: error resending reset code", e);
        });
        break;
      case 'cancel-verify':
        // Back to the forgot-password form.
        clearInterval(this._tick);
        this._counting = false;
        this.showForgot();
        break;
      case 'use-apple':
        this.postService(SERVICE.apple.initiate, {}).then((data) => {
          this._handleResponse(data);
          document.onvisibilitychange = () => {
            location.reload()
          }
        })
        break;
      case 'use-google':
        this.postService(SERVICE.google.initiate, {}).then((data) => {
          this._handleResponse(data);
          document.onvisibilitychange = () => {
            location.reload()
          }
        })
        break;
      case 'see-services-terms':
      case 'see-privacy-terms':
      case 'see-cookies-terms': {
        const { terms_of_use, privacy_policy } = Platform.get('legals') || {};
        const url = service === 'see-services-terms' ? terms_of_use : privacy_policy;
        if (!url) break;
        if (Visitor.device() == _a.mobile) {
          location.href = url;
        } else {
          const settings = 'height=800,width=800,left=150,top=90,noopener,noreferrer,toolbar=yes,menubar=yes,location=yes,directories=no,status=yes';
          window.open(url, 'popUpWindow', settings);
        }
        break;
      }

    }
  }


  /**
   *
  */
  loadTermsAndConditions() {
    // Welcome.getPart('wrapper-modal').feed(require('./skeleton/terms-and-conditions').default(this))
    return
  }

  /**
   *
  */
  downloadTermsAndConditions() {
    this.debug('downloadTermsAndConditions', this)
    let url = "https://qh7fEQuCMW7POEIYNN7Jw.app.drumee.org/Docs/CGU-DRUMEE.pdf"
    window.open(url, "_blank", "noopener; noreferrer");
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
          location.href = data.authUrl;
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
