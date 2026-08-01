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
   * Precedence: an explicit `content` option, then whatever _loadShare() fetched
   * with the token, then the Figma sample.
   *
   * The sample is used ONLY when there is no token — i.e. the demo
   * #/plugins entry point. Once a token is present the page shows the real share
   * or nothing: presenting sample files as if they were someone's actual
   * workspace would be worse than an empty folder.
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
    if (this._shareContent) return this._shareContent;
    if (this._shareToken()) return { folders: [], files: [], messages: [] };
    return require('./sample-content');
  }

  /**
   * The share token from the invite link, external scope only.
   * @returns {string}
   */
  _shareToken() {
    if (!this.isExternal()) return '';
    return String(this.mget('token') || '').trim();
  }

  /**
   * Resolve a service path from the host's SERVICE map, falling back to the
   * conventional dotted name. The map is assembled at runtime by the host, so a
   * plugin cannot assume a given branch is present.
   * @param {string} group
   * @param {string} name
   * @returns {string}
   */
  _svc(group, name) {
    const g = (typeof SERVICE !== 'undefined' && SERVICE && SERVICE[group]) || null;
    return (g && g[name]) || `${group}.${name}`;
  }

  /**
   * Load the real shared folder using the token the invite link carried.
   *
   * Two calls, the same pair ui-team's dmz/sharebox makes:
   *   dmz.login          redeems the token and opens the anonymous session the
   *                      next call needs; returns the shared node (nid, name).
   *                      hub_id is optional — the server resolves it from the
   *                      token, which is why the link needn't carry one.
   *   media.show_node_by lists that node's children ({nid, page}).
   *
   * The server decides what a token may see (its privilege is clamped to the
   * share's caps server-side), so nothing here widens access; this only renders
   * what the session is already allowed to list.
   *
   * Anything unexpected — no token, an error, a gated share (dmz.login answers
   * with a `status` such as REQUIRED_PASSWORD) — leaves the page on empty rows
   * rather than falling back to the sample.
   */
  async _loadShare() {
    const token = this._shareToken();
    if (!token) return;
    let content = { folders: [], files: [], messages: [] };
    try {
      const info = await this.postService(this._svc('dmz', 'login'), {
        token,
        hub_id: this.mget('hub_id') || '',
      });
      if (!info || info.error || info.error_code || info.status) {
        this.warn('[signin_guest] share not readable', (info && (info.status || info.error)) || 'no response');
      } else {
        // The share knows its own name; prefer it over the one on the URL.
        const name = info.title || info.filename || info.name;
        if (name) this.mset({ title: name });
        const rows = await this.postService(this._svc('media', 'show_node_by'), {
          nid: info.nid,
          page: 1,
        });
        const { mapListing } = require('./share-content');
        content = { ...mapListing(rows), messages: [] };
      }
    } catch (e) {
      this.warn('[signin_guest] share load failed', e && (e.reason || e.message));
    }
    this._shareContent = content;
    // Re-render with what came back (or with empty rows on failure).
    this.feed(require('./skeleton').default(this));
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
    // Render first, then fill in: the chrome is useful immediately and the
    // listing re-feeds when it arrives. No token (internal, or the demo entry
    // point) → this returns straight away and the page never makes a request.
    this._loadShare();
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
