# Quantity Picker
---

This component provides a input of type `number` for changing the amount of e.g. a cart item. The minimum amount is 1. If the user enters 0 or a number below it will automatically switch back to 1.

## Getting Started

```jsx
import QuantityPicker from 'Pages/Cart/components/Item/components/Product/components/Layout/components/QuantityPicker';

<QuantityPicker quantity={...} />
```

## Props

### quantity

_Type_: `number`  
_Default_: `1`  

The quantity as a number. It must be above 1 and can only take integers.

###### Usage:

```jsx
<QuantityPicker quantity={6} />
```

### editMode

_Type_: `boolean`  
_Default_: `true`

Whether or not the edit mode is active. This prop can be used by surrounding components to tell the `QuantityPicker` to focus or blur it's input field.

```jsx
<QuantityPicker editMode={true} />
```

### onToggleEditMode
_Type_: `Function`  
_Default_: `(enabled) => {}`

This callback is executed, when the edit mode within the `QuantityPicker` changed. It has a single `boolean` parameter, which is `true` on `focus` and `false` on `blur`.

```jsx
<QuantityPicker onToggleEditMode=(enabled) => {} />
```

### onChange
_Type_: `Function`  
_Default_: `(value) => {}`

This callback is executed, when the `QuantityPicker` blurred, and it's value was changed.

---
