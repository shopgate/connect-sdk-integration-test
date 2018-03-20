const Message = require('../models/messages/message')
const Tools = require('../lib/tools')
const request = require('request')
const _ = require('underscore')

/**
 * @typedef {object} input
 * @property {Array} CartItem
 *
 * @param {object} context
 * @param {object} input
 * @param {function} cb
 */
module.exports = function (context, input, cb) {
  let messages = []
  let success = false
  if (Tools.objectIsEmpty(input.sgxsMeta.sessionId)) {
    const message = new Message()
    message.addErrorMessage('EUNKNOWN', 'SessionId is missing.')
    messages.push(message)
    return cb(null, {success: success, messages: messages})
  }

  const shopgateApi = require('../lib/shopgate.api.js')(context.config)

  const cartItems = []
  /**
   * @typedef {object} item
   * @property {string} CartItemId
   */
  _.each(input.CartItem, function (item) {
    cartItems.push({
      shop_cart_item_id: item.CartItemId.toString(),
      quantity: item.quantity
    })
  })

  const appCommand = {
    conn: 'wifi',
    cmds: [{
      c: 'update_products_in_cart',
      p: cartItems
    }],
    vars: {
      sid: input.sgxsMeta.sessionId,
      did: context.meta.deviceId
    },
    ver: '2.0',
    serial: 1
  }

  const params = {
    method: 'POST',
    url: shopgateApi.getCakeUrl(),
    body: appCommand,
    json: true,
    headers: shopgateApi.getRequestHeaders()
  }

  params.headers['Cookie'] = `SHOPGATE=${input.sgxsMeta.sessionId}`

  request.post(params, function (err, response, body) {
    if (err) {
      return cb(err)
    }

    if (_.isEmpty(body.cmds)) {
      const errorMessage = new Message()
      errorMessage.type = errorMessage.TYPE_ERROR
      errorMessage.code = 'EUNKNOWN'
      errorMessage.message = 'Cake-Response is empty'
      messages.push(errorMessage.toJson())
      return cb(null, {messages: messages})
    }

    /* Within the response, there is more than one object, so we need to iterate through */
    _.each(body.cmds, function (response) {
      success = response.p.success
      if (!success) {
        /**
         * @typedef {object} responseMessage
         * @property {string} element
         */
        _.each(response.p.messages, function (responseMessage) {
          const message = new Message()
          message.type = message.TYPE_INFO
          if (responseMessage.element === 'message_error') {
            message.type = message.TYPE_ERROR
          }
          message.code = 'EUNKNOWN'
          message.message = responseMessage.message
          messages.push(message.toJson())
        })
      }
    })

    if (success) {
      return cb(null, {})
    } else {
      return cb(null, {messages: messages})
    }
  })
}
