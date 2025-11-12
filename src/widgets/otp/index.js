
/**
 * Class representing signup page in Welcome module.
 * @class __welcome_signup
 * @extends __welcome_interact
 */
require('./skin');
class signup_otp extends LetcBox {

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
  bindPasteEvent() {
    this.ensurePart("digits").then(async (p) => {
      await Kind.waitFor('entry');
      for (let c of p.children.toArray()) {
        c.once("input:ready", () => {
          c._input[0].onpaste = (e) => {
            setTimeout(() => {
              this.debug("OM ZZZ PASTE", e, c.getValue())
              let value = c.getValue() || '';
              if (!/[0-9]{1,6}/.test(value)) {
                c.setValue("")
                return
              }
              let digits = value.split('');
              let i = c.getIndex();
              for (let d of digits) {
                if (!p.children._views[i]) continue;
                p.children._views[i].setValue(d);
                i++;
              }
              this.checkForm()
            }, 300)
          }
        })
      }
    })
  }

  /**
   * 
   */
  checkForm() {
    this.ensurePart("digits").then((p) => {
      let res = [];
      for (let c of p.children.toArray()) {
        let v = c.getValue()
        if (/[0-9]/.test(v)) {
          res.push(v)
        }
      }
      if (res.length >= 6) {
        this.debug("COMPLTE", res.join(''));
        this.postService(SERVICE.signup.verify_otp, { otp: res.join('') }).then((data) => {
          this.debug("AAA:6zz5", data)
          if (data && user.email) {
            this.debug("AAA:67 triggerHandlers")
            this.triggerHandlers({ service: 'signup-completed' })
          } else {
            this.debug("AAA:70 triggerHandlers")
            this.triggerHandlers({ service: 'onboarding' })
          }
        }).catch((e) => {
          this.debug("AAA:71", e)
        })
      }
    })
  }

  /**
   *
  */
  onDomRefresh() {
    this.feed(require("./skeleton").default(this));
    this.bindPasteEvent();
  }


  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    let status = cmd.status;
    this.debug(`onUiEvent service = ${service}`, args, status, cmd);
    switch (service) {
      case _a.input:
        cmd.focus();
        if (status == _e.click) {
          cmd.setValue('');
          return;
        }
        let res = [];
        this.ensurePart("digits").then((p) => {
          let i = cmd.getIndex() + 1;
          let value = cmd.getValue();
          for (let c of p.children.toArray()) {
            if (c.getIndex() < i) {
              continue;
            } else {
              if (/[0-9]/.test(value) && /[0-9]/.test(status)) {
                c.focus();
                c.setValue('')
              } else {
                cmd.setValue('');
              }
              break;
            }
          }
          this.checkForm()
        })
        break;
    }
  }

  /**
   *
  */
  renderMessage(msg) {
    this.debug('renderMessage', msg, this)
    const msgBox = Skeletons.Note({
      className: `${this.fig.family}__note error-msg`,
      content: msg
    })

    if (!this.__buttonWrapper || !this.__buttonWrapper) return;
    this.__buttonWrapper.el.dataset.mode = _a.closed;
    this.__messageBox.el.dataset.mode = _a.open;
    this.__messageBox.feed(msgBox);

    const f = () => {
      this.__messageBox.el.dataset.mode = _a.closed
      this.__messageBox.clear()
      this.__buttonWrapper.el.dataset.mode = _a.open
    }
    return _.delay(f, Visitor.timeout(3000))
  }


  /**
   * @param {string} code
  */
  handleError(code) {
    switch (code) {
      case 'IDENT_NOT_AVAILABLE':
        this.renderMessage(LOCALE.DOMAIN_ALREADY_EXISTS);
        return;
      case 'INVALID_IDENT':
        this.renderMessage(LOCALE.REQUIRE_IDENT);
        return;
      default:
        this.renderMessage(LOCALE.SOMETHING_WENT_WRONG + ` (${code})`);
    }
  }

}

module.exports = signup_otp
