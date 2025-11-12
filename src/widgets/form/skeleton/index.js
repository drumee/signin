const { entry, header, button, password, termsAndConditions } = require("../../toolkit/skeleton")

function __skl_welcome_signup(ui) {
  const fig = ui.fig.family
  let haptic = 10000;
  const form = Skeletons.Box.Y({
    className: `${fig}__form`,
    kids: [
      entry(ui, {
        placeholder: "example@email.com",
        name: _a.email,
        sys_pn: _a.email,
        service: _a.input,
        value: ui.mget(_a.email) || ""
      }),
      password(ui, {
        placeholder: "",
        name: _a.password,
        sys_pn: _a.password,
        service: _a.input,
        type: _a.password,
      }),
      button(ui, {
        label: LOCALE.CONTINUE,
        service: 'signin',
        type: _a.email,
        ico: "arrow-right",
        sys_pn: "commit-button",
        haptic
      }),
    ]
  })

  const buttons = Skeletons.Box.Y({
    className: `${fig}__buttons`,
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
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      header(ui, LOCALE.JOIN_DRUMEE_FOR_FREE),
      form,
      Skeletons.Box.X({
        className: `${fig}__links`,
        kids: [
          Skeletons.Element({ content: LOCALE.Q_NO_ACCOUNT, className: `${fig}__text` }),
          Skeletons.Element({ content: LOCALE.SIGN_UP, className: `${fig}__text link c1`, href: "#/welcome/signup" }),
          Skeletons.Element({ content: `${LOCALE.Q_FORGOT_PASSWORD}?`, className: `${fig}__text link c2`, href: "#/welcome/reset" }),
        ]
      }),
      Skeletons.Element({ content: LOCALE.OR, className: `${fig}__separator` }),
      buttons,
      termsAndConditions(ui)
    ]
  })

  return a;

}

export default __skl_welcome_signup