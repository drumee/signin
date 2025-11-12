const { entry, header, button, termsAndConditions } = require("../../toolkit/skeleton")

function __skl_welcome_signup(ui) {
  const signupFig = ui.fig.family
  let haptic= 10000;
  const form = Skeletons.Box.Y({
    className: `${signupFig}__form`,
    kids: [
      entry(ui, {
        placeholder: "example@email.com",
        name: _a.email,
        sys_pn: _a.email,
        service: _a.input,
        value: ui.mget(_a.email) || ""
      }),
      button(ui, {
        label: LOCALE.CONTINUE_WITH_EMAIL,
        service: 'use-email',
        type: _a.email,
        ico: "arrow-right",
        sys_pn:"commit-button",
        haptic
      }),
    ]
  })

  const buttons = Skeletons.Box.Y({
    className: `${signupFig}__buttons`,
    kids: [
      button(ui, {
        label: LOCALE.CONTINUE_WITH_GOOGLE,
        service: 'use-google',
        type: _a.api,
        ico: "logo-google",
        priority: "secondary",
        haptic
      }),
      button(ui, {
        label: LOCALE.CONTINUE_WITH_APPLEID,
        service: 'use-apple',
        type: _a.api,
        ico: "logo-apple",
        priority: "secondary",
        haptic
      }),
    ]
  })

  let a = Skeletons.Box.Y({
    className: `${signupFig}__main`,
    debug: __filename,
    kids: [
      header(ui, LOCALE.JOIN_DRUMEE_FOR_FREE),
      form,
      Skeletons.Element({ content: LOCALE.OR, className: `${signupFig}__separator` }),
      buttons,
      termsAndConditions(ui)
    ]
  })

  return a;

}

export default __skl_welcome_signup