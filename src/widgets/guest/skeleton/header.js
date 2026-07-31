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
  const external = ui.isExternal();

  const name = ui.mget(_a.title) || ui.mget(_a.name) || "";
  // External reads as an invitation to a shared space; internal states a
  // restriction. Figma 1602:77081 vs 1602:76946.
  const prefix = external
    ? LOCALE.GUEST_SHARED_PROJECT || "Shared Project:"
    : LOCALE.GUEST_RESTRICTED_PROJECT || "Restricted Project:";
  const fallback = external
    ? LOCALE.GUEST_SHARED_TITLE || "Shared workspace"
    : LOCALE.GUEST_RESTRICTED_TITLE || "Restricted workspace";
  const title = name ? `${prefix} ${name}` : fallback;

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
          // A shared workspace is reached BY the link, so it shows the link
          // glyph; a restricted one shows the padlock.
          external
            ? Skeletons.Button.Svg({
                ico: "apps-link-simple",
                className: `${fig}__header-link`,
              })
            : Skeletons.Element({
                className: `${fig}__header-lock`,
                content: " ",
              }),
          Skeletons.Note({
            className: `${fig}__header-sublabel`,
            content: external
              ? LOCALE.SHARED_BY_LINK || "Shared by link"
              : LOCALE.GUEST_RESTRICTED_ACCESS || "Restricted Guest Access",
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
          Skeletons.Button.Svg({
            ico: "folder-header",
            className: `${fig}__header-tile-ico`,
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
