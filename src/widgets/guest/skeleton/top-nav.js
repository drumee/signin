// Public marketing site. The nav links leave the Drumee instance the guest landed
// on — same target as ui-team's dmz/sharebox top-nav.
const DRUMEE_SITE = "https://drumee.com/";

/**
 * Top app bar: logo | Product · Features · Pricing | Login + Join Workspace.
 * @param {LetcBox} ui
 */
function __skl_signin_guest_top_nav(ui) {
  const fig = ui.fig.family;

  const logo = Skeletons.Element({
    className: `${fig}__nav-logo`,
    content: " ",
  });

  // Marketing links are real anchors (href => the builder renders an <a>), so they
  // open in a new tab without going through onUiEvent.
  const navLink = (label) =>
    Skeletons.Box.X({
      className: `${fig}__nav-link`,
      href: DRUMEE_SITE,
      attrOpt: { target: "_blank", rel: "noopener noreferrer" },
      kids: [
        Skeletons.Note({
          className: `${fig}__nav-link-label`,
          content: label,
        }),
      ],
    });

  const links = Skeletons.Box.X({
    className: `${fig}__nav-links`,
    kids: [
      navLink(LOCALE.PRODUCT || "Product"),
      navLink(LOCALE.FEATURES || "Features"),
      navLink(LOCALE.PRICING || "Pricing"),
    ],
  });

  const actions = Skeletons.Box.X({
    className: `${fig}__nav-actions`,
    kids: [
      Skeletons.Note({
        className: `${fig}__nav-login`,
        content: LOCALE.LOGIN || "Login",
        service: 'go-login',
        uiHandler: [ui],
        kidsOpt: { active: 0 },
      }),
      Skeletons.Note({
        className: `${fig}__nav-join`,
        content: LOCALE.JOIN_WORKSPACE || "Join Workspace",
        service: 'open-signup',
        uiHandler: [ui],
        kidsOpt: { active: 0 },
      }),
    ],
  });

  return Skeletons.Box.X({
    className: `${fig}__nav`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__nav-inner`,
        kids: [logo, links, actions],
      }),
    ],
  });
}

module.exports = __skl_signin_guest_top_nav;
