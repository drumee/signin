/**
 * Guest landing page shown to an ANONYMOUS visitor who lands on a workspace they
 * cannot see: the content appears as a redacted (blurred) file grid + chat panel
 * behind a centred "Content Restricted" card, with a sticky conversion banner.
 *
 * Deliberately self-contained — it issues NO requests and holds no share state.
 * Everything behind the card is decoration (see ./skeleton/split-view.js), so the
 * page renders identically whichever entry point served it:
 *   #/plugins?name=signin&kind=signin_guest   (direct, via src/seeds.js)
 *   #/welcome/signin?view=guest               (through signin_router)
 *
 * Figma: node 1602:76946 "Guest Landing Page (Viral) Restricted".
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
   *
  */
  onDomRefresh() {
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
