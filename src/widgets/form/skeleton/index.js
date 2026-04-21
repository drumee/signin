const { entry, header, button, password, termsAndConditions } = require("../../toolkit/skeleton")

function __skl_welcome_signup(ui) {
  const fig = ui.fig.family
  let haptic = 10000;
  let message = Skeletons.Box.X({
    className: `${fig}__error-container`,
    kids: [
      Skeletons.Note({
        className: `${fig}__error-content`,
        content: "",
        sys_pn: _a.message
      }),
    ]
  })
  const form = Skeletons.Box.Y({
    className: `${fig}__form`,
    kids: [
      entry(ui, {
        label: LOCALE.WORK_EMAIL || "WORK EMAIL",
        placeholder: LOCALE.EMAIL_PLACEHOLDER || "name@company.com",
        name: _a.username,
        sys_pn: _a.username,
        service: _a.input,
        ico: "mail",
        value: ui.mget(_a.username) || ""
      }),
      password(ui, {
        label: LOCALE.PASSWORD_LABEL || "PASSWORD",
        placeholder: LOCALE.PASSWORD_PLACEHOLDER || "name@company.com",
        name: _a.password,
        sys_pn: _a.password,
        service: _a.input,
        ico: "lock",
      }),
      message,
      button(ui, {
        label: LOCALE.SIGN_IN_TO_WORKSPACE || "Sign In to Workspace",
        service: 'signin',
        type: _a.email,
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
    ]
  })

  let card = Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      header(ui, LOCALE.WELCOME_TO_DRUMEE || "Welcome to DRUMEE", LOCALE.SIGN_IN_SUBTITLE || "Sign in to your sovereign workspace"),
      form,
      Skeletons.Element({ content: LOCALE.OR, className: `${fig}__separator` }),
      buttons,
      Skeletons.Box.X({
        className: `${fig}__links`,
        kids: [
          Skeletons.Element({ content: LOCALE.Q_NO_ACCOUNT || "Don't have an account?", className: `${fig}__text` }),
          Skeletons.Element({ content: LOCALE.START_FREE || "Start free →", className: `${fig}__text link`, href: "#/welcome/signup" }),
        ]
      }),
      termsAndConditions(ui),
    ]
  })

  let a = Skeletons.Box.Y({
    className: `${fig}__wrapper`,
    kids: [
      card,
    ]
  })

  return a;
}

export default __skl_welcome_signup
