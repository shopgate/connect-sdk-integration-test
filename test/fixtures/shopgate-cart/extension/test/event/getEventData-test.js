const assert = require('assert')
const getEventData = require('../../event/getEventData')
const Total = new (require('../../models/cart/totals/total'))()

describe('getEventData', () => {
  it('Return total of cart', (done) => {
    const input = {
      totals: [
        {
          amount: 23.99,
          type: Total.TYPE_GRANDTOTAL
        }
      ]
    }

    getEventData({}, input, (err, result) => {
      assert.ifError(err)
      assert.equal(result.eventData.amount, 2399)
      done()
    })
  })

  it('Return zero when grand total not found', (done) => {
    getEventData({}, {}, (err, result) => {
      assert.ifError(err)
      assert.equal(result.eventData.amount, 0)
      done()
    })
  })
})
