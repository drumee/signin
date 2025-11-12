const { header } = require("../../toolkit/skeleton")

function __skl_welcome_signup(ui) {
  const fig = ui.fig.family
  const { title, message, buttons } = ui.model.toJSON()
  const Buttons = Skeletons.Box.X({
    className: `${fig}__buttons`,
    kids: buttons
  })

  let a = Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      header(ui, title),
      Skeletons.Element({ className: `${fig}__message`, content: message || LOCALE.ERROR_SERVER }),
      Buttons
    ]
  })

  return a;

}

export default __skl_welcome_signup