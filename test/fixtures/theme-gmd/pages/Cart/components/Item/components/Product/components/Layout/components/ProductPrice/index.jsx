/**
 * Copyright (c) 2017-present, Shopgate, Inc. All rights reserved.
 *
 * This source code is licensed under the Apache 2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import Portal from '@shopgate/pwa-common/components/Portal';
import * as portals from '@shopgate/pwa-common-commerce/cart/constants/Portals';
import Price from 'Components/Price';
import PriceStriked from 'Components/PriceStriked';
import styles from './style';

/**
 * The Cart Product Price component.
 * @param {Object} props The component props.
 * @param {Object} context The component context.
 * @returns {JSX}
 */
const ProductPrice = ({ currency, defaultPrice, specialPrice }, context) => (
  <Fragment>
    {!!specialPrice && (
      <Fragment>
        <Portal name={portals.CART_ITEM_PRICE_STRIKED_BEFORE} props={context} />
        <Portal name={portals.CART_ITEM_PRICE_STRIKED} props={context}>
          <PriceStriked
            className={styles.priceStriked}
            value={defaultPrice}
            currency={currency}
          />
        </Portal>
        <Portal name={portals.CART_ITEM_PRICE_STRIKED_AFTER} props={context} />
      </Fragment>
    )}
    <Portal name={portals.CART_ITEM_PRICE_BEFORE} props={context} />
    <Portal name={portals.CART_ITEM_PRICE} props={context}>
      <Price
        className={styles.price}
        currency={currency}
        discounted={!!specialPrice}
        taxDisclaimer
        unitPrice={specialPrice || defaultPrice}
      />
    </Portal>
    <Portal name={portals.CART_ITEM_PRICE_AFTER} props={context} />
  </Fragment>
);

ProductPrice.propTypes = {
  currency: PropTypes.string.isRequired,
  defaultPrice: PropTypes.number.isRequired,
  specialPrice: PropTypes.number,
};

ProductPrice.defaultProps = {
  specialPrice: null,
};

ProductPrice.contextTypes = {
  cartItemId: PropTypes.string,
  type: PropTypes.string,
};

export default ProductPrice;
