const { button } = require("../../toolkit/skeleton");

/**
 * Check-inbox view shown after the forgot-password form is submitted.
 * Tells the user a reset code was emailed, with a resend button (on a
 * countdown cooldown — see ../index.js) and a cancel button that returns
 * to the forgot-password form.
 */
function __skl_check_inbox(ui) {
  const fam = ui.fig.family;
  const email = ui.mget(_a.email) || "";

  const card = Skeletons.Box.Y({
    className: `${fam}__main ${fam}__check-inbox`,
    debug: __filename,
    kids: [
      // Envelope icon in a soft primary circle
      Skeletons.Box.X({
        className: `${fam}__inbox-icon`,
        kids: [
          Skeletons.Button.Svg({ ico: "app-mail", className: `${fam}__envelope` }),
        ],
      }),
      // Heading: title + (we sent / email)
      Skeletons.Box.Y({
        className: `${fam}__inbox-heading`,
        kids: [
          Skeletons.Element({
            className: `${fam}__inbox-title`,
            content: LOCALE.CHECK_YOUR_INBOX || "Check your inbox",
          }),
          Skeletons.Box.Y({
            className: `${fam}__inbox-subtext`,
            kids: [
              Skeletons.Element({
                className: `${fam}__inbox-sent`,
                content: LOCALE.WE_SENT_CODE_TO || "We sent a password reset code to",
              }),
              Skeletons.Element({ className: `${fam}__inbox-email`, content: email }),
            ],
          }),
        ],
      }),
      // Actions
      Skeletons.Box.Y({
        className: `${fam}__inbox-actions`,
        kids: [
          button(ui, {
            label: LOCALE.RESEND_CODE || "Resend code",
            service: "resend-email",
            ico: "refresh-view",
            type: _a.api,
            sys_pn: "resend-button",
            priority: "primary",
          }),
          button(ui, {
            label: LOCALE.CANCEL || "Cancel",
            service: "cancel-verify",
            sys_pn: "cancel-button",
            priority: "secondary",
          }),
        ],
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${fam}__wrapper`,
    kids: [card],
  });
}

export default __skl_check_inbox;
