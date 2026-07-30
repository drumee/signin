/**
 * Workspace header: folder tile + "Restricted Project: {name}" + "Restricted Guest
 * Access" subline on the left, breadcrumb pill on the right.
 *
 * All three strings come from the widget's OWN options so a host can pass real
 * names without this page ever calling an API; with nothing passed they fall back
 * to generic localized copy (never the Figma sample data).
 *
 * @param {LetcBox} ui
 */
function __skl_signin_guest_header(ui) {
  const fig = ui.fig.family;

  const name = ui.mget(_a.title) || ui.mget(_a.name) || "";
  const title = name
    ? `${LOCALE.GUEST_RESTRICTED_PROJECT || "Restricted Project:"} ${name}`
    : (LOCALE.GUEST_RESTRICTED_TITLE || "Restricted workspace");

  const titleBlock = Skeletons.Box.Y({
    className: `${fig}__header-titles`,
    kids: [
      Skeletons.Note({
        className: `${fig}__header-title`,
        content: title,
      }),
      Skeletons.Box.X({
        className: `${fig}__header-subline`,
        kids: [
          Skeletons.Element({
            className: `${fig}__header-lock`,
            content: " ",
          }),
          Skeletons.Note({
            className: `${fig}__header-sublabel`,
            content: LOCALE.GUEST_RESTRICTED_ACCESS || "Restricted Guest Access",
          }),
        ],
      }),
    ],
  });

  const left = Skeletons.Box.X({
    className: `${fig}__header-left`,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__header-tile`,
        kids: [
          Skeletons.Element({
            className: `${fig}__header-tile-ico`,
            content: " ",
          }),
        ],
      }),
      titleBlock,
    ],
  });

  const breadcrumb = Skeletons.Box.X({
    className: `${fig}__breadcrumb`,
    kids: [
      Skeletons.Note({
        className: `${fig}__crumb parent`,
        content: ui.mget(_a.parent_name) || LOCALE.GUEST_BREADCRUMB_PARENT || "Workspace",
      }),
      Skeletons.Note({
        className: `${fig}__crumb separator`,
        content: "/",
      }),
      Skeletons.Note({
        className: `${fig}__crumb current`,
        content: ui.mget('current_name') || LOCALE.GUEST_BREADCRUMB_CURRENT || "Private content",
      }),
    ],
  });

  return Skeletons.Box.X({
    className: `${fig}__header`,
    debug: __filename,
    kids: [left, breadcrumb],
  });
}

module.exports = __skl_signin_guest_header;
