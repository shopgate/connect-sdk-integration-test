class Tools {
  /**
   * @property {function} context.storage.device
   * @param obj
   * @param path
   * @return {boolean}
   * @public
   */
  static isObjectDefined (obj, path) {
    if (!obj) return false
    if (obj && !path) return true

    const props = path.split('.')
    let currentObject = obj

    for (let i = 0; i < props.length; ++i) {
      currentObject = currentObject[props[i]]
      if (!currentObject) return false
    }

    return true
  }

  /**
   * For parsing the price
   * @param price
   * @returns {number}
   */
  static parsePrice (price) {
    return parseFloat(price / 100)
  }

  /**
   * @param {object} obj
   * @return {boolean}
   */
  static objectIsEmpty (obj) {
    /* Speed up calls to hasOwnProperty */
    let hasOwnProperty = Object.prototype.hasOwnProperty
    /* null and undefined are "empty" */
    if (obj === null) return true

    /* Objects with a length greater than zero cannot be empty. */
    if (obj.length > 0) return false
    if (obj.length === 0) return true

    /* Never treat non-objects as empty */
    if (typeof obj !== 'object') return true

    /* Check if any properties are available */
    for (let key in obj) {
      if (hasOwnProperty.call(obj, key)) return false
    }

    return true
  }

  /**
   * @typedef {object} context.meta
   * @property {string) userId
   *
   * @typedef {object} context.storage.user
   * @property {function} context.storage.user.get
   * @property {function} context.storage.user.set
   *
   * @param {object} context
   * @param {function} cb
   * @return {string}
   */
  static getCurrentCartId (context, cb) {
    const userId = context.meta.userId
    if (userId) {
      context.storage.user.get('cartId', (sErr, cartId) => {
        return cb(sErr, cartId)
      })
    } else {
      context.storage.device.get('cartId', (sErr, cartId) => {
        return cb(sErr, cartId)
      })
    }
  }

  /**
   * @param {string} text
   * @return {string}
   */
  static htmlDecode (text) {
    var replacements = [
      ['amp', '&'],
      ['apos', '\''],
      ['lt', '<'],
      ['gt', '>'],
      ['euro', '€']
    ];

    replacements.forEach(function(replace){
      text = text.replace(new RegExp('&'+replace[0]+';', 'g'), replace[1]);
    });

    return text;
  }

  /**
   *
   * @param {object} context
   * @param {string} cartId
   * @param {function} cb
   * @return {string}
   */
  static setCurrentCartId (context, cartId, cb) {
    const userId = context.meta.userId
    if (userId) {
      context.storage.user.set('cartId', cartId, function (sErr) {
        if (sErr) return cb(sErr)
        return cb(null)
      })
    } else {
      context.storage.device.set('cartId', cartId, function (sErr) {
        if (sErr) return cb(sErr)
        return cb(null)
      })
    }
  }
}

module.exports = Tools
