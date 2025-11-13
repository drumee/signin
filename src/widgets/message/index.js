
/**
 * Class representing Signin page in Welcome module.
 * @class __welcome_Signin
 * @extends __welcome_interact
 */
const Signin = require("..")
require('./skin');

class signin_message extends Signin {

  /**
   ** @param {object} opt
  */
  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this.mset({ flow: _a.y })
  }

  /**
   *
  */
  onDomRefresh() {
    this.feed(require('./skeleton').default(this));
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    this.debug(`onUiEvent service = ${service}`, cmd, this);

    switch (service) {
      default:
        this.triggerHandlers({ service })
    }
  }

}

module.exports = signin_message
