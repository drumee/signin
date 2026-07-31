/**
 * Guest landing page for an ANONYMOUS visitor, in two scopes:
 *
 *   internal  the workspace is private — its contents render as redacted
 *             placeholders behind a "Content Restricted" card.
 *             Figma 1602:76946 "Guest Landing Page (Viral) Restricted".
 *   external  the workspace is shared by link — its contents render for real,
 *             in a window with tabs, filters and a Conversation panel.
 *             Figma 1602:77081 "Guest Landing Page (Viral) Link shared".
 *
 * Scope arrives as an option (`scope`), set by the invite email's CTA via
 * signin_router; anything other than "external" is treated as internal, so a
 * missing or unknown value can never un-redact a private workspace.
 *
 * Entry points, both of which end up here:
 *   #/plugins?name=signin&kind=signin_guest   (direct, via src/seeds.js)
 *   #/welcome/signin?view=guest&scope=…       (through signin_router)
 *
 * @class signin_guest
 * @extends LetcBox
 */
require('./skin');

class signin_guest extends LetcBox {

  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this.mset({ flow: _a.y });
    // Same LOCALE bootstrap as signin_router: extend() when the host exposes it,
    // otherwise merge the visitor's language file over the global.
    try {
      LOCALE.extend(require("../../locale")('en'));
    } catch (e) {
      LOCALE = { ...LOCALE, ...require("../../locale")(Visitor.language()) }
    }
  }

  /**
   * True only for an explicitly external (shared) workspace. Fails closed: an
   * absent, empty or unrecognised scope renders the redacted internal layout, so
   * a lost query param can never expose a private workspace's contents.
   * @returns {boolean}
   */
  isExternal() {
    return String(this.mget('scope') || '').trim().toLowerCase() === 'external';
  }

  /**
   * The workspace's display name, as the window title and the header both show
   * it. Falls back to the generic scope wording when the caller passed no name,
   * so the title bar is never blank.
   * @returns {string}
   */
  workspaceName() {
    const name = (this.mget(_a.title) || this.mget(_a.name) || '').trim();
    if (name) return name;
    return this.isExternal()
      ? LOCALE.GUEST_SHARED_TITLE || 'External workspace'
      : LOCALE.GUEST_RESTRICTED_TITLE || 'Internal workspace';
  }

  /**
   * Rows the external layout renders: { folders, files, messages }.
   *
   * Supplied through options so the view stays a pure function of its data —
   * a host (or a future fetch) can pass the real share contents straight in.
   * With nothing passed it returns the sample set from the Figma frame, which is
   * what the direct #/plugins entry point shows.
   *
   * NOT wired to the share API yet. Doing that needs the anonymous session the
   * dmz module establishes (SERVICE.dmz.login with the share token, then
   * SERVICE.media.show_node_by for the listing) — see ui-team dmz/sharebox. The
   * token already reaches this widget as the `token` option; hub_id does not,
   * and dmz.login wants it (it tolerates "" and resolves by token). Deliberately
   * left as this seam rather than a half-tested session flow.
   *
   * @returns {{folders: Array, files: Array, messages: Array}}
   */
  externalContent() {
    const opt = this.mget('content');
    if (opt && (opt.folders || opt.files || opt.messages)) {
      return {
        folders: opt.folders || [],
        files: opt.files || [],
        messages: opt.messages || [],
      };
    }
    return require('./sample-content');
  }

  /**
   *
  */
  onDomRefresh() {
    // One attribute the whole skin switches on — red/lock for internal, pink/link
    // for external — so neither skeleton has to know about the other's styling.
    if (this.el) {
      this.el.dataset.scope = this.isExternal() ? 'external' : 'internal';
    }
    this.feed(require('./skeleton').default(this));
  }

  /**
   * Both CTAs leave the plugin for the normal welcome flow. A full page reload is
   * intentional — it is what the rest of the welcome flow does, and it guarantees
   * the sign-in/sign-up plugin boots against a clean hash.
   * @param {string} hash
   */
  _leaveTo(hash) {
    if (location.hash === hash) return location.reload();
    location.hash = hash;
    location.reload();
  }

  /**
   * @param {*} cmd
   * @param {*} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case 'go-login':
        return this._leaveTo('#/welcome/signin');

      case 'open-signup':
        return this._leaveTo('#/welcome/signup');
    }
  }
}

module.exports = signin_guest
