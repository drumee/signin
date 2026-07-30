/**
 * The "Content Restricted" card, centred over the redacted file grid.
 * The eye-slash glyph is an exported Figma asset (skin: __card-ico) — the icon
 * sprite has no slashed-eye variant.
 * @param {LetcBox} ui
 */
function __skl_signin_guest_restricted_card(ui) {
  const fig = ui.fig.family;

  return Skeletons.Box.Y({
    className: `${fig}__card`,
    debug: __filename,
    kids: [
      Skeletons.Element({
        className: `${fig}__card-ico`,
        content: " ",
      }),
      Skeletons.Note({
        className: `${fig}__card-title`,
        content: LOCALE.CONTENT_RESTRICTED_TITLE || "Content Restricted",
      }),
      Skeletons.Box.Y({
        className: `${fig}__card-text`,
        kids: [
          Skeletons.Note({
            className: `${fig}__card-line`,
            content: LOCALE.CONTENT_RESTRICTED_LINE_1 ||
              "This workspace is currently locked for guests.",
          }),
          Skeletons.Note({
            className: `${fig}__card-line`,
            content: LOCALE.CONTENT_RESTRICTED_LINE_2 ||
              "Please sign up or log in to view and download these assets.",
          }),
        ],
      }),
    ],
  });
}

module.exports = __skl_signin_guest_restricted_card;
