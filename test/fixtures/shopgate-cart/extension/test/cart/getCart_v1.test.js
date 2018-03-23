const chai = require('chai')
const assert = chai.assert
const AppliedDiscount = require('../../models/cart/cartItems/products/appliedDiscounts/appliedDiscount')
const rewire = require('rewire');
var getCart = rewire('../../cart/getCart_v1')

addDiscount = getCart.__get__('addAppliedDiscount')

describe('addAppliedDiscount', function () {

    let priceInfo
    let appliedDiscount = new AppliedDiscount()

    beforeEach(function () {
        priceInfo = {
            'discount_label': 'discount_label',
            'discount_amount': 10,
            'price_label': 'price_label'
        }
    })

    it('Return percentage based coupon', function () {
        priceInfo.discount_percent = 5
        const result = addDiscount(priceInfo)
        assert.equal(result.savedPrice.type, appliedDiscount.VALUETYPE_PERCENTAGE)
        assert.equal(result.savedPrice.value, priceInfo.discount_percent)
    })

    it('Return fixed coupon', function () {
        const result = addDiscount(priceInfo)
        assert.equal(result.savedPrice.type, appliedDiscount.VALUETYPE_FIXED)
        assert.equal(result.savedPrice.value, priceInfo.discount_amount)
    })
})