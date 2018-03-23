const Tools = require('../lib/tools')
const Message = require('../models/messages/message')
const Cart = require('../models/cart/cart')
const CartItem = require('../models/cart/cartItems/cartItem')
const Text = require('../models/cart/text/text')
const Total = require('../models/cart/totals/total')
const SubTotal = require('../models/cart/totals/subTotals/subTotal')
const Product = require('../models/cart/cartItems/products/product')
const AdditionalInfo = require('../models/cart/cartItems/products/additionalInfo/additionalInfo')
const AppliedDiscount = require('../models/cart/cartItems/products/appliedDiscounts/appliedDiscount')
const Price = require('../models/cart/cartItems/products/price/price')
const Property = require('../models/cart/cartItems/products/properties/property')
const Coupon = require('../models/cart/cartItems/coupon/coupon')
const request = require('request')
const _ = require('underscore')

/**
 * Creates an applied discount which can be added to an product
 * @param priceInfo
 * @returns {AppliedDiscount}
 *
 * @typedef {object} priceInfo
 * @property {string} discount_label
 * @property {number} discount_amount
 * @property {string} price_label
 * @property {number} discount_percent
 */
function addAppliedDiscount (priceInfo) {
  const appliedDiscount = new AppliedDiscount()
  appliedDiscount.label = priceInfo.discount_label
  appliedDiscount.savedPrice = priceInfo.discount_amount
  appliedDiscount.description = priceInfo.price_label
  appliedDiscount.code = null
  if (Tools.isObjectDefined(priceInfo.discount_percent)) {
    appliedDiscount.savedPrice = {
      type: appliedDiscount.VALUETYPE_PERCENTAGE,
      value: priceInfo.discount_percent
    }
  } else {
    appliedDiscount.savedPrice = {
      type: appliedDiscount.VALUETYPE_FIXED,
      value: priceInfo.discount_amount
    }
  }
  return appliedDiscount
}

/**
 * Adds the specific type of a property to the product
 * @param input
 * @param product
 * @param type
 *
 * @typedef {object} input
 * @property {object} ShopItemInputField
 * @property {object} ShopCartItemInput
 * @property {object} ShopItemOption
 * @property {object} ShopItemOptionValue
 *
 * @typedef {object} ShopCartItemInput
 * @property {string} user_input
 * @property {number} shop_item_input_field_id
 */
function addProperty (input, product, type) {
  const property = new Property()

  if (type === 'input') {
    property.type = property.TYPE_INPUT
    property.label = input.ShopItemInputField.label
    property.value = input.ShopCartItemInput.user_input
  } else if (type === 'option') {
    property.type = property.TYPE_OPTION
    property.label = input.ShopItemOption.name
    property.value = input.ShopItemOptionValue.name
  } else {
    property.type = property.TYPE_OPTION
    property.label = input.label
    property.value = input.value
  }

  product.properties.push(property.toJson())
}

/**
 * Adds specific additional infos
 * @param shopItem
 * @param product
 *
 * @typedef {object} shopItem
 * @property {string} manufacturer
 * @property {number} stock_quantity
 */
function addAdditionalInfos (shopItem, product) {
  if (!Tools.objectIsEmpty(shopItem.manufacturer)) {
    const manufacturer = new AdditionalInfo()
    manufacturer.label = 'Manufacturer'
    manufacturer.value = shopItem.manufacturer
    product.additionalInfo.push(manufacturer.toJson())
  }
}

/**
 * Adds totals to the cart
 * @param cakeResponse
 * @param cart
 * @param shopId
 *
 * @typedef {object} cakeResponse
 * @property {object} complete_cart_info
 *
 * @typedef {object} complete_cart_info
 * @property {object} shop_cart_info
 */
function addTotals (cakeResponse, cart, shopId) {
  let cartTotals = cakeResponse.complete_cart_info.shop_cart_info

  // Add messages
  _.each(cartTotals.messages, function (cartMessage) {
    cart.messages.push(cartMessage)
  })

  // Add info and legal texts
  const text = new Text()
  text.legalText = cartTotals.legal_text
  text.infoText = cartTotals.additional_info_text
  cart.text = text.toJson()

  // Add currency
  cart.currency = cartTotals.currency_id

  // Add discounts
  _.each(cakeResponse.coupons, function (coupon) {
    const couponValues = coupon.Coupon
    const discountSubtotal = new SubTotal()
    discountSubtotal.type = discountSubtotal.TYPE_DISCOUNT
    discountSubtotal.label = couponValues.public_name
    discountSubtotal.amount = Tools.parsePrice(couponValues.amount)
    cart.addTotal(discountSubtotal.toJson())
  })

  // Add subtotal
  const subTotal = new Total()

  // calculate the coupon amount to reduce subtotal amount
  let totalDiscountAmount = 0;
  if (!Tools.objectIsEmpty(cart.totals)) {
    const subTotal = new SubTotal()
    _.each(cart.totals, function (total) {
      if (total.type === subTotal.TYPE_DISCOUNT) {
        totalDiscountAmount = totalDiscountAmount + total.amount * 100
      }
    })
  }

  subTotal.amount = Tools.parsePrice(cartTotals.amount_items_gross - totalDiscountAmount)
  subTotal.type = subTotal.TYPE_SUBTOTAL
  cart.addTotal(subTotal.toJson())

  // Add taxes
  let isTaxIncluded = false
  if (Tools.isObjectDefined(cakeResponse.tax_details[shopId]) && !Tools.objectIsEmpty(cakeResponse.tax_details[shopId].taxes)) {
    const taxDetails = _.toArray(cakeResponse.tax_details[shopId].taxes)[0]
    const tax = new Total()
    tax.label = cartTotals.tax_label
    tax.amount = Tools.parsePrice(taxDetails.tax_amount)
    tax.type = tax.TYPE_TAX
    cart.addTotal(tax.toJson())
    isTaxIncluded = true
  }
  cart.flags.taxIncluded = cart.isTaxIncluded = isTaxIncluded

  // Add shipping costs
  if (Tools.isObjectDefined(cartTotals.amount_shipping)) {
    const shippingCosts = new SubTotal()
    shippingCosts.type = shippingCosts.TYPE_SHIPPING
    shippingCosts.label = ''
    shippingCosts.amount = Tools.parsePrice(cartTotals.amount_shipping)
    cart.addTotal(shippingCosts.toJson())
  }

  // Add grandtotal
  const grandTotal = new Total()
  grandTotal.amount = Tools.parsePrice(cartTotals.amount_complete_gross)
  grandTotal.type = grandTotal.TYPE_GRANDTOTAL
  cart.addTotal(grandTotal.toJson())
}

/**
 * @typedef {object} input
 * @property {object} sgxsMeta
 * @property {string} sessionId
 *
 * @param context
 * @param input
 * @param cb
 * @returns {Cart, Message}
 */
module.exports = function (context, input, cb) {
  let messages = []
  if (Tools.objectIsEmpty(input.sgxsMeta.sessionId)) {
    const message = new Message()
    message.addErrorMessage('EUNKNOWN', 'SessionId is missing.')
    messages.push(message)
    return cb(null, {success: false, messages: messages})
  }

  const shopgateApi = require('../lib/shopgate.api.js')(context.config)

  const appCommand = {
    conn: 'wifi',
    cmds: [{
      c: 'get_cart',
      p: {}
    }],
    vars: {
      sid: input.sgxsMeta.sessionId,
      did: context.meta.deviceId
    },
    ver: '2.0'
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

    let cakeResponse = null
    /**
     * @typedef {object} cakeResponse
     * @property {object} complete_cart_info
     * @property {Array} shop_cart_infos
     * @property {object} error_message
     * @property {Array} tax_details
     *
     * @typedef {object} tax_details.taxes
     *
     * @typedef {object} complete_cart_info
     * @property {object} ShopCartInfo
     * @property {string} tax_label
     * @property {number} tax_amount
     * @property {number} amount_shipping
     *
     * @typdef {object} ShopCartInfo
     * @property {string} legal_text
     * @property {string} additional_info_text
     * @property {string} currency_id
     * @property {number} amount_items_gross
     *
     * @typedef {object} shop_cart_infos
     * @property {Array} cart_items
     * @property {Array} coupons
     * @property {Array} notifications
     * @property {object} errors
     *
     */
    if (_.isArray(body.cmds)) {
      cakeResponse = _.first(body.cmds).p
    } else {
      cakeResponse = body.cmds.p
    }

    if (Tools.objectIsEmpty(cakeResponse.complete_cart_info) || !Tools.isObjectDefined(cakeResponse.complete_cart_info)) {
      const errorMessage = new Message()
      errorMessage.addErrorMessage('EUNKNOWN', 'Cannot read cart')
      messages.push(errorMessage.toJson())
      return cb(null, {messages: messages})
    }

    const cartInfo = cakeResponse.shop_cart_infos
    const shopId = _.keys(cartInfo)[0]

    const cart = new Cart()

    // enable cart coupons feature
    cart.flags.coupons = true

    let shopgateCartItems = []

    if (Tools.isObjectDefined(cartInfo[shopId])) {
      shopgateCartItems = cartInfo[shopId].cart_items
    }

    // Check if cart is orderable
    let isOrderable = true
    if (Tools.isObjectDefined(cakeResponse.error_message)) {
      const cartErrorMessage = new Message()
      cartErrorMessage.type = cartErrorMessage.TYPE_ERROR
      cartErrorMessage.code = 'EUNKNOWN'
      cartErrorMessage.message = cakeResponse.error_message
      cart.messages.push(cartErrorMessage.toJson())
      isOrderable = false
    }
    cart.flags.orderable = cart.isOrderable = isOrderable;

    /**
     * Iterate through all items and add them to the cart
     *
     * @typedef {object} shopgateCartItem
     * @property {object} ShopItem
     * @property {object} ShopCartItem
     *
     * @typedef {object} ShopCartItem
     * @property {object} price_info
     * @property {Array} inputs
     *
     * @typedef {object} price_info
     * @property {number} unit_amount_display
     * @property {number} strike_price_display
     */
    _.each(shopgateCartItems, function (shopgateCartItem) {
      /**
       * @typedef {object} shopItem
       * @property {string} shop_item_number
       * @property {Array} image_urls
       * @property {int} has_image
       *
       * @typdef {Array} image_urls
       * @property {string} image_url_base
       */
      const shopItem = shopgateCartItem.shop_cart_item
      const cartItem = new CartItem()
      cartItem.type = cartItem.TYPE_PRODUCT
      cartItem.id = shopItem.id
      cartItem.quantity = parseInt(shopItem.quantity)

      const product = new Product()
      product.id = shopItem.item_number
      product.externalId = shopItem.item_number
      product.name = shopgateCartItem.product.name

      // Add product price
      const priceInfo = shopgateCartItem.product.price_info
      const price = new Price()
      price.unit = Tools.parsePrice(priceInfo.unit_amount_display)
      price.default = Tools.parsePrice(priceInfo.unit_amount_display * cartItem.quantity)

      // Strikeprice = Specialprice, if it's set we add a appliedDiscount to the product
      if (Tools.isObjectDefined(priceInfo.strike_price_display)) {
        price.default = Tools.parsePrice(priceInfo.strike_price_display) * cartItem.quantity
        price.special = Tools.parsePrice(priceInfo.unit_amount_display) * cartItem.quantity
        const appliedDiscount = addAppliedDiscount(priceInfo)
        product.appliedDiscounts.push(appliedDiscount.toJson())
      }

      product.price = price.toJson()

      if (shopgateCartItem.product.has_image === 1 && !Tools.objectIsEmpty(_.first(shopgateCartItem.product.image_urls))) {
        product.featuredImageUrl = _.first(shopgateCartItem.product.image_urls).image_url_base
      }

      // Add attributes to the product
      _.each(shopgateCartItem.product.attributes, function (attribute) {
        addProperty(attribute, product, 'attribute')
      })

      // Add inputs to the product
      _.each(shopgateCartItem.product.inputs, function (input) {
        addProperty(input, product, 'input')
      })

      // Add options to the product
      _.each(shopgateCartItem.product.options, function (option) {
        addProperty(option, product, 'option')
      })

      // Add some additional infos
      addAdditionalInfos(shopgateCartItem.product, product)

      cartItem.product = product.toJson()
      cart.cartItems.push(cartItem.toJson())
    })

    /**
     *  Iterate through the coupons and add them to the cart
     *
     *  @typdef {object} shopgateCoupon
     *  @property {object} Coupon
     *
     *  @typdef {object} couponValues
     *  @property {string} public_name
     */
    if (Tools.isObjectDefined(cakeResponse.shop_cart_infos[shopId])) {
      const shopgateCoupons = cakeResponse.shop_cart_infos[shopId].coupons
      _.each(shopgateCoupons, function (shopgateCoupon) {
        const couponValues = shopgateCoupon.Coupon
        const coupon = new Coupon()
        coupon.code = couponValues.code
        coupon.label = couponValues.public_name
        coupon.description = couponValues.description

        if (Tools.isObjectDefined(couponValues.amount)) {
          coupon.savedPrice = {
            type: coupon.VALUETYPE_FIXED,
            value: Tools.parsePrice(couponValues.amount)
          }
        }

        const couponCartItem = new CartItem()
        couponCartItem.id = couponValues.id
        couponCartItem.quantity = 1
        couponCartItem.type = couponCartItem.TYPE_COUPON
        couponCartItem.coupon = coupon.toJson()

        cart.cartItems.push(couponCartItem.toJson())
      })
    }

    addTotals(cakeResponse, cart, shopId)

    // Add Notifications
    if (Tools.isObjectDefined(cakeResponse.shop_cart_infos[shopId])) {
      _.each(cakeResponse.shop_cart_infos[shopId].notifications, function (notification) {
        notification = _.first(notification)
        const cartMessage = new Message()
        cartMessage.type = cartMessage.TYPE_INFO
        cartMessage.code = 'EUNKNOWN'
        cartMessage.message = Tools.htmlDecode(notification.text)

        cart.messages.push(cartMessage.toJson())
      })
    }

    // Add Global Notification
    if (Tools.isObjectDefined(cakeResponse.errors.message)) {
      const cartMessage = new Message()
      cartMessage.type = cartMessage.TYPE_INFO
      cartMessage.message = Tools.htmlDecode(cakeResponse.errors.message)

      cart.messages.push(cartMessage.toJson())
    }

    return cb(null, cart)
  })
}
