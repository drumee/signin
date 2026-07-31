const topNav = require('./top-nav');
const header = require('./header');
const splitView = require('./split-view');
const banner = require('./banner');

/**
 * Page assembly for the anonymous guest landing page (Figma 1602:76946):
 *
 *   __nav      sticky top app bar
 *   __body     workspace header + split view (redacted files | chat)
 *   __banner   sticky bottom conversion banner
 *
 * @param {LetcBox} ui  the signin_guest instance
 */
function __skl_signin_guest(ui) {
  const fig = ui.fig.family;

  return Skeletons.Box.Y({
    className: `${fig}__page`,
    debug: __filename,
    kids: [
      topNav(ui),
      Skeletons.Box.Y({
        className: `${fig}__body`,
        kids: [
          header(ui),
          splitView(ui),
        ],
      }),
      banner(ui),
    ],
  });
}

export default __skl_signin_guest;
