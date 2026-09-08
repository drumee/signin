/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
export function button(ui, opt) {
  let {
    label,
    ico,
    service,
    sys_pn,
    className,
    priority = "primary",
    variant = "",
    type,
    haptic,
  } = opt;
  const pfx = className || `${ui.fig.group}__button`;
  let kids = [];
  if (label)
    kids.push(
      Skeletons.Element({
        className: `${pfx} btn`,
        content: label,
        tagName: _K.tag.span,
      }),
    );
  let main = Skeletons.Box.G;
  if (ico) {
    let el = Skeletons.Button.Svg({
      className: `${pfx} icon`,
      ico,
    });
    if ([_a.api].includes(type)) {
      kids.unshift(el);
      main = Skeletons.Box.X;
    } else if ([_a.row].includes(type)) {
      kids.push(el);
      main = Skeletons.Box.X;
    } else {
      kids.push(el);
      main = Skeletons.Box.G;
    }
  }

  kids.push(
    Skeletons.Element({
      className: `${pfx} spinner`,
      content: " ",
    }),
  );

  return main({
    className: `${pfx}-main ${priority} ${variant}`.trim(),
    partHandler: [ui],
    uiHandler: [ui],
    sys_pn,
    service,
    haptic,
    kidsOpt: {
      active: 0,
    },
    kids,
  });
}

/**
 * Header with drumee logo + progress bar + title + subtitle
 * @param {*} ui
 * @returns
 */
export function header(ui, content, tips, opt = {}) {
  const { logo, progress = true } = opt;
  const fig = ui.fig.family;

  // `logo` is the exported lockup (glyph + wordmark as one asset). Callers that
  // omit it keep the sprite mark plus a typeset "drumee", which only ever
  // approximated the real logotype — so the guest header and router are
  // untouched. Mirrors the signup plugin's header().
  //
  // Element, NOT Note: Note pipes content through DOMPurify against
  // _K.allowed_tag (p a br b u i ul li quote span div svg use del ins h). `img`
  // is not on that list, so a Note strips it and renders empty while CSS still
  // reserves the box. Element maps to kind `wrapper`, which sets innerHTML
  // directly with no sanitiser.
  const lockup = logo
    ? Skeletons.Element({
        className: `${fig}__logo-image`,
        content: `<img src="${logo}" alt="drumee" width="121" height="24">`,
      })
    : Skeletons.Box.X({
        className: `${fig}__logo-container`,
        kids: [
          Skeletons.Button.Svg({
            ico: "logo-upload",
            className: `${fig}__logo-content`,
          }),
          Skeletons.Element({
            className: `${fig}__logo-text`,
            content: "drumee",
          }),
        ],
      });

  // Figma 155:46803 keeps the header row to the lockup alone. `progress` is
  // opt-out rather than opt-in so the guest header and the OTP router, which
  // still show the five-step bar, are untouched.
  const progressBar = progress
    ? Skeletons.Box.X({
        className: `${fig}__progress-bar`,
        kids: [
          Skeletons.Element({
            className: `${fig}__progress-step active`,
            content: " ",
          }),
          Skeletons.Element({
            className: `${fig}__progress-step`,
            content: " ",
          }),
          Skeletons.Element({
            className: `${fig}__progress-step`,
            content: " ",
          }),
          Skeletons.Element({
            className: `${fig}__progress-step`,
            content: " ",
          }),
          Skeletons.Element({
            className: `${fig}__progress-step`,
            content: " ",
          }),
        ],
      })
    : null;

  let kids = [
    Skeletons.Box.X({
      className: `${fig}__header-top`,
      kids: [lockup, progressBar].filter(Boolean),
    }),
    Skeletons.Box.Y({
      className: `${fig}__text-container`,
      kids: [
        Skeletons.Note({
          className: `${fig}__title`,
          content,
        }),
      ],
    }),
  ];

  

  let a = Skeletons.Box.Y({
    className: `${ui.fig.family}__header`,
    debug: __filename,
    kids,
  });
  return a;
}

/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
export function entry(ui, opt) {
  let {
    value,
    name,
    placeholder,
    label,
    sys_pn,
    service = _a.input,
    autocomplete,
    ico,
  } = opt;
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
    radio: ui._id,
  };
  if (sys_pn) {
    args.sys_pn = sys_pn;
    args.partHandler = [ui];
  }

  let kids = [];
  if (label) {
    kids.push(
      Skeletons.Note({
        className: `${pfx}-label ${name}`,
        content: label,
      }),
    );
  }

  let entryKids = [];
  if (ico) {
    entryKids.push(
      Skeletons.Button.Svg({
        ico,
        className: `${pfx}-ico`,
      }),
    );
  }
  entryKids.push(Skeletons.Entry(args));

  kids.push(
    Skeletons.Box.X({
      className: `${pfx}-row`,
      kids: entryKids,
    }),
  );

  return Skeletons.Box.Y({
    className: `${pfx}-main`,
    kids,
  });
}

/**
 * Password entry - uses same pattern as entry() with Skeletons.Entry
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
export function password(ui, opt) {
  let {
    value,
    name = _a.password,
    placeholder,
    label,
    sys_pn,
    service = _a.input,
    autocomplete,
    ico,
    footer,
  } = opt;
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
    radio: ui._id,
    type: _a.password,
  };
  if (sys_pn) {
    args.sys_pn = sys_pn;
    args.partHandler = [ui];
  }

  let kids = [];
  if (label) {
    kids.push(
      Skeletons.Note({
        className: `${pfx}-label ${name}`,
        content: label,
      }),
    );
  }

  let entryKids = [];
  if (ico) {
    entryKids.push(
      Skeletons.Button.Svg({
        ico,
        className: `${pfx}-ico`,
      }),
    );
  }
  entryKids.push(Skeletons.Entry(args));
  entryKids.push(
    Skeletons.Button.Svg({
      ico: "eye_closed",
      className: `${pfx}-eye-toggle`,
      service: "toggle-password-visibility",
      uiHandler: [ui],
      sys_pn: `${name}-eye`,
      partHandler: [ui],
    }),
  );

  // Figma 155:46944: the field and whatever sits under it (the validation /
  // "Forgot Password" row) are their own 8px-gap group, tighter than the 12px
  // that separates the label from the field. Always wrapping keeps one
  // selector for the row whether or not a caller passes a footer.
  kids.push(
    Skeletons.Box.Y({
      className: `${pfx}-group`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}-row`,
          kids: entryKids,
        }),
      ].concat(footer || []),
    }),
  );

  return Skeletons.Box.Y({
    className: `${pfx}-main`,
    kids,
  });
}

/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
export function termsAndConditions(ui, opt) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__terms-container`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__terms-link`,
        content: LOCALE.PRIVACY_POLICY || "PRIVACY POLICY",
        service: "see-privacy-terms",
        uiHandler: [ui],
      }),
      Skeletons.Element({
        className: `${pfx}__terms-dot`,
        content: " ",
      }),
      Skeletons.Note({
        className: `${pfx}__terms-link`,
        content: LOCALE.TERM_OF_SERVICE || "TERM OF SERVICE",
        service: "see-services-terms",
        uiHandler: [ui],
      }),
    ],
  });
}

/**
 * Step indicator shown below the card
 * e.g. "● STEP 1 OF 5: IDENTITY VERIFICATION"
 */
export function stepIndicator(ui, opt = {}) {
  const pfx = ui.fig.family;
  let { step = 1, total = 5, label = "" } = opt;
  return Skeletons.Box.X({
    className: `${pfx}__step-indicator`,
    kids: [
      Skeletons.Element({
        className: `${pfx}__step-dot`,
        content: "●",
      }),
      Skeletons.Element({
        className: `${pfx}__step-text`,
        content: `STEP ${step} OF ${total}: ${label}`,
      }),
    ],
  });
}
