const Total = new (require('../models/cart/totals/total'))()
/**
 * @param {object} context
 * @param {object} input
 * @param {Array} input.totals
 *
 * @example input.totals
 * ...,
 * {
 *  "label": null,
 *  "amount": 23.99,
 *  "type": "grandTotal"
 * }
 * @param {function} cb
 */
module.exports = function (context, input, cb) {
  cb(null, {
    eventData: {
      amount: getCartAmount(input.totals || [])
    }
  })
}

function getCartAmount (totals) {
  let cartAmount = 0
  totals.forEach(e => {
    if (e.type === Total.TYPE_GRANDTOTAL) {
      cartAmount = e.amount * 100
    }
  })
  return cartAmount
}
