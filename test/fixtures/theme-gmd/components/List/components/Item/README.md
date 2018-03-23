# List Item Component
---

This component styles it's children around a GMD style list item.

## Getting Started

```
import { List } from 'Templates/components';

<List.Item title="My List Item" />
```

## Props

### title (required)

_Type_: `string`  

###### Usage:

```
<List.Item title="My Title" />
```

### image

_Default_: `null`  
_Type_: `string`  

###### Usage:

```
<List.Item image="/url/to/image" />
```

### rightComponent

A component or element to render on the right-hand side of the list item.

_Default_: `null`  
_Type_: `element`  

###### Usage:

```
const myComponent = <div />;

<List.Item rightComponent={myComponent} />
```

### isDisabled

_Default_: `false`  
_Type_: `boolean`  

###### Usage:

```
<List.Item isDisabled />
```

### isSelected

_Default_: `false`  
_Type_: `boolean`  

###### Usage:

```
<List.Item isSelected />
```

### link

_Default_: `null`  
_Type_: `string`  

###### Usage:

```
<List.Item link="url/to/page" />
```

### onClick

_Default_: `null`  
_Type_: `string`  

###### Usage:

```
const handleClick = () => {
  ...
};

<List.Item onClick={handleClick} />
```
---
