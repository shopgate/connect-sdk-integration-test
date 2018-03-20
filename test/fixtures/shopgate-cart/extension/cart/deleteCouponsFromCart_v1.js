const Message = require('../models/messages/message')
const Tools = require('../lib/tools')
const request = require('request')
const _ = require('underscore')

/**
 * @typedef {object} input
 * @property {Array} CartItemIds
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

  const couponCodes = []
  _.each(input.couponCodes, function(couponCode){
    couponCodes.push(
      couponCode.toString()
    )
  })

  const appCommand = {
    conn: 'wifi',
    cmds: [{
      c: 'remove_coupons_from_cart',
      p: couponCodes
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

    /* Evaluate the response */
    const cakeRespone = body.cmds[0].p
    success = cakeRespone.success
    if (!success) {
      _.each(cakeRespone.messages, function(responseMessage) {
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

    if (success) {
      return cb(null, {})
    } else {
      return cb(null, {messages: messages})
    }
  })
}
