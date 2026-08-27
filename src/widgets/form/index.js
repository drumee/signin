
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

/**
 * The campaign, referral and DESTINATION this visit arrived on, as flat
 * request params.
 *
 * WHY THIS HAS TO BE SENT. google.initiate / apple.initiate park attribution
 * on the oauth_state row so it survives the redirect out to the provider —
 * the callback runs server-side and cannot reach browser storage. But they
 * read it off the REQUEST (`this.input.get("utm_campaign")`, and `ref`
 * likewise), and this app was posting an empty payload. Measured on stage:
 * 289 oauth_state rows, none carrying a campaign or a source. Every OAuth
 * signup was recorded as organic, and the referral handle was lost with it.
 *
 * FROM localStorage, NOT THE URL. The landing capture (ui-team libs/campaign)
 * stores the tags on arrival and then STRIPS them from the address, so by the
 * time anyone reaches this button the URL no longer carries them. Storage is
 * the only remaining copy.
 *
 * FLATTENED, because that is the shape initiate reads: the stored value is an
 * object, the service asks for utm_source / utm_medium / utm_campaign /
 * utm_content one by one.
 *
 * KEEP THE KEYS IN STEP with libs/campaign (which writes drumee_utm) and with
 * signup's clearStoredAttribution (which removes both once a signup spends
 * them).
 *
 * `dest` RIDES ALONG FOR THE SAME REASON, and is the one key here that is not
 * attribution. A campaign CTA names where the visitor is going —
 * "#/desk/billing?plan=team&tab=checkout&promo=…" — and ui-team parks that in
 * sessionStorage before the signin plugin rewrites the hash. That carries an
 * email/password sign-in, which stays in one tab on one origin. It does not
 * carry OAuth: the callback is server-side, it rebuilds the landing URL from
 * scratch, and a URL fragment never reaches a server at all. So the
 * destination has to travel the same road the campaign already travels — into
 * oauth_state at initiate, back out onto the landing URL at callback.
 *
 * sessionStorage, NOT localStorage, unlike everything else here: that is where
 * ui-team's billing-deep-link keeps it, deliberately, so an "open billing"
 * intent dies with the tab rather than surprising someone days later. Read
 * only — clearing it belongs to that module's consume().
 *
 * @returns {Object} only what was actually stored — {} when nothing was
 */
function storedAttribution() {
  const out = {};
  try {
    const utm = JSON.parse(localStorage.getItem('drumee_utm') || '{}') || {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
      if (utm[k]) out[k] = String(utm[k]).trim().slice(0, 64);
    }
  } catch (e) { /* private mode, quota, or a corrupt value */ }
  try {
    const ref = localStorage.getItem('drumee_ref') || '';
    if (ref) out.ref = String(ref).trim().toLowerCase().slice(0, 64);
  } catch (e) { /* as above */ }
  // ITS OWN try/catch, like the two above: a destination must never be able to
  // stop somebody signing in. Private mode, blocked storage and a corrupt value
  // all throw on access, and "no destination" is the honest answer to each.
  try {
    const raw = sessionStorage.getItem('drumee_billingDeepLink');
    if (raw) {
      const p = JSON.parse(raw) || {};
      // Rebuilt from the keys, not forwarded as a blob: loby validates this
      // against an allowlist of one path and four params and refuses anything
      // it did not expect, so sending the stored object's own shape would only
      // produce a value the server throws away. Fixed order, matching what the
      // sanitiser rebuilds, so the two ends agree on one string.
      const q = [];
      for (const k of ['plan', 'cycle', 'tab', 'promo']) {
        if (p[k]) q.push(`${k}=${String(p[k]).trim()}`);
      }
      const dest = `/desk/billing${q.length ? `?${q.join('&')}` : ''}`;
      if (dest.length <= 255) out.dest = dest;
    }
  } catch (e) { /* as above */ }
  return out;
}

/**
 * Put the billing destination back on the URL before the post-login reload.
 *
 * WHY THIS EXISTS, and it is the difference between the two sign-in methods.
 *
 * The billing intent is armed in sessionStorage on the origin the CTA was
 * clicked — drumee.in. A successful sign-in reloads, and ui-team's router then
 * runs, in this order:
 *
 *   if (Visitor.isOnline() && hostname != Organization.host())
 *     changeHost(Organization.host());      // location.host = host
 *
 * Every account that claimed the Team promo lives on its own subdomain
 * (team-NNNN.drumee.in), so for exactly the audience these campaign links are
 * sent to, that branch fires. `location.host = host` is a CROSS-ORIGIN
 * navigation, and sessionStorage is per-origin: the intent does not survive it.
 * The desk then mounts on the new host, finds nothing armed, and the visitor
 * lands on a bare desk having asked for a checkout screen.
 *
 * ui-team anticipated this. libs/billing-deep-link accepts a second URL shape —
 * `?billing=1` anywhere in the hash — precisely because "changeHost does
 * location.host = host, which keeps path and hash, so an arg rides across the
 * host switch a signed-in visitor gets sent through, where per-origin storage
 * cannot follow". That carrier works; it simply was never on the URL, because
 * this app replaces the hash with #/welcome/signin long before the switch.
 *
 * So this writes it back. After the reload the URL carries the destination, the
 * host switch preserves it, and the router's captureFromUrl() re-arms it on the
 * NEW origin — where the desk can finally consume it.
 *
 * NOT NEEDED FOR OAUTH, which never reaches this method: that flow leaves for
 * the provider and returns through loby, which builds its own landing URL. That
 * path carries the destination on oauth_state instead.
 *
 * Read-only on the stored intent. Clearing it belongs to billing-deep-link's
 * consume(), and a sign-in that fails must leave it exactly as it was.
 *
 * RETURNS A URL RATHER THAN SETTING location.hash, and that is not a style
 * choice — the first version of this did set the hash and it did not stick.
 * The router owns the hash on this screen and rewrites it back to
 * #/welcome/signin, and the sign-in success path waits a second before
 * reloading, so there is a wide window for that to happen. Handing the caller a
 * URL lets it navigate ONCE, atomically, with no gap for anything to undo.
 *
 * @returns {String|null} the URL to leave on, or null to reload as before
 */
function billingReturnUrl() {
  try {
    const raw = sessionStorage.getItem('drumee_billingDeepLink');
    // null, not false — the contract is "a URL or nothing", and the caller
    // branches on it. A stray boolean here reads as a third state that does not
    // exist. (It did return false once: a leftover from when this set the hash
    // itself and reported whether it had.)
    if (!raw) return null;
    const p = JSON.parse(raw) || {};
    // The ARG form, not the "#/desk/billing" path form. The path form would
    // send the visitor to billing on the OLD host, before the switch; the arg
    // rides the switch and is read on arrival.
    const q = ['billing=1'];
    for (const k of ['plan', 'cycle', 'tab', 'promo']) {
      if (p[k]) q.push(`${k}=${encodeURIComponent(String(p[k]).trim())}`);
    }
    // Rebuilt onto the CURRENT route rather than appended blindly: the hash may
    // already carry params (oauth_mfa=1&email=… on the 2FA screen), and
    // duplicating a key would make parseParams read whichever came first.
    const hash = String(location.hash || '#/welcome/signin');
    const path = hash.split('?')[0] || '#/welcome/signin';
    return `${location.origin}${location.pathname}${location.search}${path}?${q.join('&')}`;
  } catch (e) {
    // Private mode, blocked storage, a corrupt value. Signing in must never
    // depend on any of it — the visitor simply reloads as before.
    return null;
  }
}

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
    // If the reset link is completed in another tab (the welcome/reset module
    // shows its success screen and writes this flag), disable the resend button
    // here — there's nothing left to resend. `storage` events fire in OTHER
    // same-origin tabs, which is exactly the email-link-in-new-tab case.
    if (!this._onResetDone) {
      this._onResetDone = (e) => {
        if (e && e.key === 'drumee:password-reset:done') {
          this._disableResend();
        }
      };
      window.addEventListener('storage', this._onResetDone);
    }
  }

  /**
   * Permanently disable the resend button (reset already completed elsewhere).
  */
  _disableResend() {
    clearInterval(this._tick);
    this._counting = true; // the resend-email handler ignores clicks while set
    this.ensurePart('resend-button').then((b) => {
      if (!b || !b.el) return;
      delete b.el.dataset.counting;
      b.el.dataset.disabled = '1';
    });
  }

  /**
   * Clean up the running cooldown timer and cross-tab listener.
  */
  onDestroy() {
    clearInterval(this._tick);
    if (this._onResetDone) {
      window.removeEventListener('storage', this._onResetDone);
      this._onResetDone = null;
    }
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
      if (label) label.textContent = LOCALE.RESEND_EMAIL || "Resend email";
      delete b.el.dataset.counting;
    });
  }

  /**
   * Validate the forgot-password form then email the reset-link template.
   * Validation: (1) value is a well-formed email, (2) the email is
   * registered in the database. Only then send the reset-password email
   * (otp.send_link) and move to the check-inbox view.
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

    // (2) Must exist in the database before we send the reset email.
    this.postService(SERVICE.yp.email_exists, { value: username }).then((res) => {
      if (!res || !res.id) {
        this.setItemStatus(_a.username, _a.error, _a.status);
        this.setItemStatus('forgot-button', "0", "haptic");
        this.renderMessage(LOCALE.OOPS_EMAIL_NOT_FOUND || "No account found with this email", 3000);
        return;
      }
      // Email the styled "Reset your Drumee password" link template.
      // send_link requires socket_id (server verifies the socket is bound to
      // this session), so pass the current websocket id.
      return this.postService(SERVICE.otp.send_link, { email: username, socket_id: Visitor.get(_a.socket_id) }).then((data) => {
        this.setItemStatus('forgot-button', "0", "haptic");
        if (data && data.sent) {
          this.mset({ email: username });
          this.showCheckInbox();
        } else {
          this.setItemStatus(_a.username, _a.error, _a.status);
          this.renderMessage(LOCALE.OOPS_EMAIL_NOT_FOUND || "No account found with this email", 3000);
        }
      });
    }).catch((e) => {
      this.setItemStatus('forgot-button', "0", "haptic");
      this.warn("submitForgot: error validating/sending reset email", e);
    });
  }

  /**
   * 
   * @param {*} data 
   */
  checkLoginStatus(data) {
    // Keep the commit-button spinner running on the 2FA path (data.secret): the
    // router then dynamically imports + renders the OTP card, and the spinner is
    // cleared naturally when that card replaces this form. Releasing it on a
    // fixed timer leaves a dead, feedback-less gap on the old form meanwhile.
    // Every other path (no secret) releases the button so the user can retry.
    if (!data.secret) {
      setTimeout(() => {
        this.setItemStatus('commit-button', "0", "haptic");
      }, 500)
    }
    switch (data.status) {
      case "INCOMPLETE_SIGNUP":
        this.triggerHandlers({ service: "onboarding" })
        return
      case "EMAIL_NOT_VERIFIED": {
        // Account exists but its email hasn't been verified yet. Rather than
        // jumping straight to the verify screen, stay on the sign-in layout and
        // surface an inline "email not verified" banner + a "Verify email" CTA
        // (rendered by the skeleton when _unverifiedEmail is set). Clicking the
        // CTA fires `go-verify`, which moves the user to the Check-your-inbox /
        // resend-activation screen. Re-feed so the banner appears; keep the
        // typed email in the field (the skeleton reads _a.username).
        this._unverifiedEmail = data.email || (this.getData() || {}).username || "";
        this.mset({ [_a.username]: this._unverifiedEmail });
        this.feed(require('./skeleton').default(this));
        return;
      }
      case "BLOCKED":
      case "ARCHIVED":
        return this.renderMessage(LOCALE.BLOCKED_ACCOUNT);

      case "ok":
        setTimeout(() => {
          // ONE navigation, carrying the destination if there is one. The URL
          // is built at the last possible moment and applied atomically:
          // setting location.hash earlier and reloading afterwards leaves a
          // window in which the router rewrites the hash back to
          // #/welcome/signin, which is exactly what the first version of this
          // did. See billingReturnUrl.
          //
          // replace(), not assign(): the signin screen should not be a back-
          // button destination once the session exists.
          const back = billingReturnUrl();
          if (back) return location.replace(back);
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
      // The yp.signin response doesn't reliably echo `email` back (same as the
      // EMAIL_NOT_VERIFIED branch above). The OTP screen needs it for both the
      // "sent to {email}" message and Resend (otp.send keys off email), so fall
      // back to the typed username — which is the email at sign-in. Without
      // this, resend only works after a page refresh, when Visitor supplies it.
      const email = data.email || (this.getData() || {}).username || "";
      this.triggerHandlers({ service: "verify-signin-otp", data: { ...data, email } })
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
      case 'go-verify': {
        // CTA on the "email not verified" banner: move to the signup app's
        // Check-your-inbox / resend-activation screen, carrying the email.
        // reload() is REQUIRED: signup is a separate page-plugin and the host
        // welcome router only dispatches loadSignup() from route() on boot, so a
        // bare same-module hash change would not re-route.
        const email = this._unverifiedEmail || (this.getData() || {}).username || "";
        const q = email ? `?email=${encodeURIComponent(email)}&pending=1` : `?pending=1`;
        location.hash = `#/welcome/signup${q}`;
        location.reload();
        break;
      }
      case 'forgot-input':
        if (![_e.commit, _e.Enter].includes(status)) break;
      case 'forgot-submit':
        this.submitForgot();
        break;
      case 'back-to-signin':
        clearInterval(this._tick);
        this._counting = false;
        this.showSignin();
        break;
      case 'resend-email':
        // Ignore clicks while the cooldown is running.
        if (this._counting) break;
        this.setItemStatus('resend-button', "1", "haptic"); // loading spinner
        this.postService(SERVICE.otp.send_link, { email: this.mget(_a.email) || "", socket_id: Visitor.get(_a.socket_id) }).then((data) => {
          this.setItemStatus('resend-button', "0", "haptic");
          if (data && data.sent) {
            this._startCooldown(COOLDOWN_SEC);
          } else {
            this.renderMessage(LOCALE.OOPS_EMAIL_NOT_FOUND || "No account found with this email", 3000);
          }
        }).catch((e) => {
          this.setItemStatus('resend-button', "0", "haptic");
          this.warn("resend-email: error resending reset email", e);
        });
        break;
      case 'cancel-verify':
        // Back to the forgot-password form.
        clearInterval(this._tick);
        this._counting = false;
        this.showForgot();
        break;
      case 'use-apple':
        this.postService(SERVICE.apple.initiate, storedAttribution()).then((data) => {
          this._handleResponse(data);
          document.onvisibilitychange = () => {
            location.reload()
          }
        })
        break;
      case 'use-google':
        this.postService(SERVICE.google.initiate, storedAttribution()).then((data) => {
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
