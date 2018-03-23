const Message = require('../models/messages/message')
const Tools = require('../lib/tools')
const request = require('request')
const _ = require('underscore')

/**
 * @typedef {object} input
 * @property {Array} products
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

  const products = []
  /**
   * @typedef {object} product
   * @property {string} productId
   * @property {option[]} options
   * @typedef {object} option
   * @property {string} type
   * @property {string} id
   * @property {string} value
   */
  _.each(input.products, function (product) {
    const options = {}
    const inputFields = {}

    if (Tools.isObjectDefined(product.options)) {
      _.each(product.options, function (item) {
        switch (item.type) {
          case 'select' :
            options[item.id] = item.value
            break
          case 'text' :
            inputFields[item.id] = item.value
            break
        }
      })
    }

    products.push({
      item_number: product.productId.toString(),
      quantity: product.quantity,
      options: options,
      input_fields: inputFields
    })
  })

  const appCommand = {
    conn: 'wifi',
    cmds: [{
      c: 'add_products_to_cart',
      p: products
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
      if (response.c === 'addProductToCart') {
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
      }
    })

    if (success) {
      return cb(null, {})
    } else {
      return cb(null, {messages: messages})
    }
  })
}
