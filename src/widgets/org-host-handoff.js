/* Shared by widgets/form (password sign-in) and widgets/router (OTP / 2FA). */
/**
 * ONE WARM-UP PER SIGN-IN: hand off straight to the account's org host.
 *
 * The login answer names the account's organisation (server-core
 * session.signin → my_organisation). For an account on its own org host
 * (yipejo5194.drumee.in) signing in at drumee.in, the post-login path used to
 * reload drumee.in — a full boot behind the warm-up screen — only for ui-team's
 * router to find the org host and switch to it: a SECOND full boot. Stage log
 * 2026-11-06 10:14: yp.signin, then yp.get_env on the main hub 6.5 s later,
 * then yp.get_env on the org hub 5.5 s after that.
 *
 * So when the org lives on another host, go there now: ONE cross-origin load.
 * Through uiRouter.changeHost, which carries a Designation link armed while
 * signed out and a signup offer across the switch — the same hand-off the
 * reload path ended in, minus the extra boot. The billing destination goes on
 * the URL first (replaceState: same document, nothing reloads), so changeHost
 * carries it in the hash exactly as before.
 *
 * @param {Object} organization  the login answer's organisation
 * @param {String|null} back     billingReturnUrl(), or null
 * @returns {Boolean} true when the page is leaving; false → reload as before
 */
function orgHostHandoff(organization, back) {
  try {
    const host = organization && (organization.link || organization.url);
    if (!host || host === location.host) return false;
    if (typeof uiRouter === 'undefined' || !uiRouter || typeof uiRouter.changeHost !== 'function') {
      return false;
    }
    if (back) history.replaceState(null, '', back);
    return !!uiRouter.changeHost(host);
  } catch (e) {
    return false;
  }
}

module.exports = { orgHostHandoff };
