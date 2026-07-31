/**
 * EXTERNAL (shared) workspace view — Figma 1602:77081 "Guest Landing Page
 * (Viral) Link shared".
 *
 * Where the internal layout redacts everything behind a "Content Restricted"
 * card, this one shows the workspace: one window card holding a title bar with a
 * SHARED badge, a Files/Chat/Tasks tab bar, a type-filter row, the folder + file
 * grid, and an unblurred Conversation panel.
 *
 * Content comes from ui.externalContent() — folders / files / messages — so the
 * markup is data-driven and does not care where the rows came from. See the note
 * on that method in ../index.js about wiring it to the real share.
 *
 * @param {LetcBox} ui
 */

// Figma shows one glyph per file kind; map the row's `kind` onto the sprite.
const FILE_ICO = {
  doc: "app-doc-file",
  pdf: "app-pdf-file",
  note: "app-file",
  sheet: "app-task-list",
  slides: "app-file",
  image: "bg-image",
};

/**
 * Title bar: folder glyph + name + SHARED badge on the left, the window's own
 * controls on the right. The controls are inert chrome — a guest cannot upload,
 * add or configure anything — so they carry no service and are aria-hidden.
 */
function windowBar(ui) {
  const fig = ui.fig.family;

  const left = Skeletons.Box.X({
    className: `${fig}__ext-bar-left`,
    kids: [
      Skeletons.Button.Svg({
        ico: "folder-header",
        className: `${fig}__ext-bar-ico`,
      }),
      Skeletons.Note({
        className: `${fig}__ext-bar-title`,
        content: LOCALE.SHARED_FOLDER || "Shared Folder",
      }),
      Skeletons.Note({
        className: `${fig}__ext-bar-badge`,
        content: LOCALE.SHARED || "Shared",
      }),
    ],
  });

  // Figma draws three kinds of control: a bare icon pill (camera), two labelled
  // pills (Upload, + Add new), then three bare glyphs (gear, split, close).
  const iconPill = (ico) =>
    Skeletons.Box.X({
      className: `${fig}__ext-bar-pill ${ico}`,
      kids: [
        Skeletons.Button.Svg({ ico, className: `${fig}__ext-bar-btn` }),
      ],
    });

  const labelPill = (ico, label, variant) =>
    Skeletons.Box.X({
      className: `${fig}__ext-bar-pill labelled ${variant}`,
      kids: [
        Skeletons.Button.Svg({ ico, className: `${fig}__ext-bar-btn` }),
        Skeletons.Note({ className: `${fig}__ext-bar-label`, content: label }),
      ],
    });

  const right = Skeletons.Box.X({
    className: `${fig}__ext-bar-right`,
    attrOpt: { "aria-hidden": "true" },
    kids: [
      iconPill("meet-camera"),
      labelPill("app-upload", LOCALE.UPLOAD || "Upload", "upload"),
      labelPill("plus-header", LOCALE.ADD_NEW || "Add new", "add-new"),
      ...["gear-header", "square-split-horizontal", "cross"].map((ico) =>
        Skeletons.Button.Svg({ ico, className: `${fig}__ext-bar-btn bare` })
      ),
    ],
  });

  return Skeletons.Box.X({
    className: `${fig}__ext-bar`,
    kids: [left, right],
  });
}

/** Files / Chat / Tasks. Files is the active tab; none of them are clickable. */
function tabs(ui) {
  const fig = ui.fig.family;
  const items = [
    { label: LOCALE.FILES || "Files", active: 1 },
    { label: LOCALE.CHAT || "Chat" },
    { label: LOCALE.TASKS || "Tasks" },
  ];
  return Skeletons.Box.X({
    className: `${fig}__ext-tabs`,
    attrOpt: { "aria-hidden": "true" },
    kids: items.map((t) =>
      Skeletons.Note({
        className: `${fig}__ext-tab${t.active ? " active" : ""}`,
        content: t.label,
      })
    ),
  });
}

/** All / Docs / PDF / Images / Other — display only, "All" underlined. */
function filters(ui) {
  const fig = ui.fig.family;
  const items = [
    { label: LOCALE.ALL || "All", active: 1 },
    { label: LOCALE.DOCS || "Docs" },
    { label: LOCALE.PDF || "PDF" },
    { label: LOCALE.IMAGES || "Images" },
    { label: LOCALE.OTHER || "Other" },
  ];
  return Skeletons.Box.X({
    className: `${fig}__ext-filters`,
    attrOpt: { "aria-hidden": "true" },
    kids: items.map((f) =>
      Skeletons.Note({
        className: `${fig}__ext-filter${f.active ? " active" : ""}`,
        content: f.label,
      })
    ),
  });
}

/** Folder tile: the pink folder art with its name underneath. */
function folderTile(ui, folder) {
  const fig = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${fig}__ext-folder`,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__ext-folder-art`,
        kids: [
          Skeletons.Button.Svg({
            ico: "folder-header",
            className: `${fig}__ext-folder-ico`,
          }),
        ],
      }),
      Skeletons.Note({
        className: `${fig}__ext-folder-name`,
        content: folder.name,
      }),
    ],
  });
}

/** File tile: type glyph on a tinted square, then name + date. */
function fileTile(ui, file) {
  const fig = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${fig}__ext-file`,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__ext-file-art ${file.kind || "doc"}`,
        kids: [
          Skeletons.Button.Svg({
            ico: FILE_ICO[file.kind] || FILE_ICO.doc,
            className: `${fig}__ext-file-ico`,
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${fig}__ext-file-meta`,
        kids: [
          Skeletons.Note({
            className: `${fig}__ext-file-name`,
            content: file.name,
          }),
          Skeletons.Button.Svg({
            ico: "bold-dot-vertical",
            className: `${fig}__ext-file-kebab`,
          }),
        ],
      }),
      Skeletons.Note({
        className: `${fig}__ext-file-date`,
        content: file.date || "",
      }),
    ],
  });
}

/**
 * Conversation panel. Unlike the internal one this renders real message text, so
 * it is NOT aria-hidden — but the composer stays a plain box (never a
 * Skeletons.Entry): a guest has no session to post with.
 */
function conversation(ui, messages) {
  const fig = ui.fig.family;

  const bubbles = messages.map((m) =>
    Skeletons.Box.Y({
      className: `${fig}__ext-msg ${m.out ? "out" : "in"}`,
      kids: [
        m.out ? null : Skeletons.Note({
          className: `${fig}__ext-msg-author`,
          content: m.author || "",
        }),
        Skeletons.Note({
          className: `${fig}__ext-bubble ${m.out ? "out" : "in"}`,
          content: m.text,
        }),
        Skeletons.Note({
          className: `${fig}__ext-msg-time`,
          content: m.time || "",
        }),
      ].filter(Boolean),
    })
  );

  const composer = Skeletons.Box.X({
    className: `${fig}__ext-composer`,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__ext-composer-field`,
        kids: [
          Skeletons.Box.X({
            className: `${fig}__ext-composer-left`,
            kids: [
              Skeletons.Button.Svg({
                ico: "app-attachment",
                className: `${fig}__ext-composer-clip`,
              }),
              Skeletons.Note({
                className: `${fig}__ext-composer-placeholder`,
                content: LOCALE.TYPE_A_MESSAGE || "Type a message...",
              }),
            ],
          }),
          Skeletons.Button.Svg({
            ico: "app-send",
            className: `${fig}__ext-composer-send`,
          }),
        ],
      }),
    ],
  });

  return Skeletons.Box.Y({
    className: `${fig}__ext-chat`,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__ext-chat-head`,
        kids: [
          Skeletons.Note({
            className: `${fig}__ext-chat-title`,
            content: LOCALE.CONVERSATION || "Conversation",
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${fig}__ext-chat-body`,
        kids: bubbles,
      }),
      composer,
    ],
  });
}

function __skl_signin_guest_external(ui) {
  const fig = ui.fig.family;
  const { folders, files, messages } = ui.externalContent();

  const filesPanel = Skeletons.Box.Y({
    className: `${fig}__ext-files`,
    kids: [
      filters(ui),
      Skeletons.Box.Y({
        className: `${fig}__ext-grid`,
        kids: [
          Skeletons.Box.X({
            className: `${fig}__ext-folder-row`,
            kids: folders.map((f) => folderTile(ui, f)),
          }),
          Skeletons.Box.X({
            className: `${fig}__ext-file-row`,
            kids: files.map((f) => fileTile(ui, f)),
          }),
        ],
      }),
    ],
  });

  return Skeletons.Box.X({
    className: `${fig}__split`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__ext`,
        kids: [
          windowBar(ui),
          tabs(ui),
          Skeletons.Box.X({
            className: `${fig}__ext-content`,
            kids: [filesPanel, conversation(ui, messages)],
          }),
        ],
      }),
    ],
  });
}

module.exports = __skl_signin_guest_external;
