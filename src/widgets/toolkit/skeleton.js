/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
export function button(ui, opt) {
  let { label, ico, service, sys_pn, className, priority="primary", type, haptic } = opt;
  const pfx = className || `${ui.fig.group}__button`;
  let kids = []
  if (label) kids.push(
    Skeletons.Element({
      className: `${pfx} btn`,
      content: label,
      tagName: _K.tag.span,
    })
  )
  let main = Skeletons.Box.G;
  if (ico) {
    let el = Skeletons.Button.Svg({
      className: `${pfx} icon`,
      ico,
    })
    if ([_a.api].includes(type)) {
      kids.unshift(el);
      main = Skeletons.Box.X;
    } else if ([_a.row].includes(type)) {
      kids.push(el)
      main = Skeletons.Box.X;
    } else {
      kids.push(el)
      main = Skeletons.Box.G;
    }
  }

  return main({
    className: `${pfx}-main ${priority}`,
    partHandler: [ui],
    uiHandler: [ui],
    sys_pn,
    service,
    haptic,
    kidsOpt: {
      active: 0,
    },
    kids
  })
}

/**
 * 
 * @param {*} ui 
 * @returns 
 */
export function header(ui, content, tips) {
  const fig = ui.fig.family;
  let kids = [
    Skeletons.Box.X({
      className: `${fig}__logo-container`,
      kids: [
        Skeletons.Button.Svg({
          ico: "raw-logo-drumee-icon",
          className: `${fig}__logo-content`,
        })
      ]
    }),

    Skeletons.Box.Y({
      className: `${fig}__text-container`,
      kids: [
        Skeletons.Note({
          className: `${fig}__title`,
          content
        }),
      ]
    })

  ]

  if (tips) {
    kids.push(Skeletons.Box.Y({
      className: `${fig}__text-container`,
      kids: [
        Skeletons.Note({
          className: `${fig}__tips`,
          tips
        }),
      ]
    }))
  }

  let a = Skeletons.Box.Y({
    className: `${ui.fig.family}__header`,
    debug: __filename,
    kids
  })
  return a;
}

/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
export function entry(ui, opt) {
  let { value, name, placeholder, label, sys_pn, service = _a.input, autocomplete } = opt;
  autocomplete = autocomplete || name;
  const pfx = `${ui.fig.family}__entry`;
  let args = {
    className: `${pfx}-input`,
    name,
    value,
    formItem: name,
    innerClass: name,
    mode: _a.interactive,
    service,
    placeholder,
    uiHandler: [ui],
    autocomplete,
    radio: ui._id
  }
  if (sys_pn) {
    args.sys_pn = sys_pn;
    args.partHandler = [ui];
  }
  return Skeletons.Box.Y({
    className: `${pfx}-main`,
    kids: [
      Skeletons.Note({
        className: `${pfx}-label ${name}`,
        content: label,
      }),
      Skeletons.Entry(args)
    ]
  })
}

/**
 * 
 * @param {*} ui 
 * @param {*} cn 
 * @param {*} passmeter 
 * @returns 
 */
export function password(ui, cn, passmeter) {
  const pfx = `${ui.fig.family}__entry`;
  const a = Skeletons.Box.X({
    className: `${pfx}-main`,
    sys_pn: 'wrapper-pw',
    partHandler: [ui],
    kids: [
      Skeletons.EntryBox({
        uiHandler: [ui],
        type: _a.password,
        className: `${pfx}-input`,
        service: _e.submit,
        name: _a.password,
        placeholder: LOCALE.PASSWORD,
        mode: _a.commit,
        sys_pn: _a.password,
        require: _a.password,
        shower: 1
      })
    ]
  });

  if (passmeter) {
    a.kids.unshift(Skeletons.Box.X({
      className: `${ui.fig.group}__pw-meter widget__pw-meter wrapper`,
      kids: [
        Skeletons.Box.X({
          className: `${ui.fig.group}__pw-meter widget__pw-meter score-limit`,
          sys_pn: 'ref-pwm-score-limit'
        }),

        Skeletons.Box.X({
          className: `${ui.fig.group}__pw-meter widget__pw-meter bar-holder`,
          kids: [
            Skeletons.Element({
              className: `${ui.fig.group}__pw-meter widget__pw-meter strength`,
              sys_pn: 'ref-pwm'
            })
          ]
        }),

        Skeletons.Button.Svg({
          ico: 'info',
          className: `${ui.fig.group}__pw-meter widget__pw-meter info`,
          tooltips: {
            content: LOCALE.DIGITS_MINIMUM_COMBINE
          }
        })
      ]
    }));
  }
  return a;
};


/**
 * 
 * @param {*} ui 
 * @param {*} opt 
 * @returns 
 */
export function termsAndConditions(ui, opt) {
  let content = LOCALE.GENERAL_TERMS_USE.format(
    `class="service" data-service="see-services-terms"`,
    `class="privacy" data-service="see-privacy-terms"`,
    `class="cookies" data-service="see-cookies-terms"`,
  )
  const pfx = ui.fig.family
  return Skeletons.Note({
    className: `${pfx}__terms`,
    content,

  });
}
