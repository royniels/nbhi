# What?

**HTML includes and reactive rendering, all without any build tools**

d--b is a simple **4KB** library that allows you to include html files into other html files and turns them into [web components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components). Lazy initialization of content (when entering the viewport) and a one line call to update/hydrate content in your html pages. No build tools required, no `package.json` needed.

# Why?

d--b is developed to create real-time data driven web sites. It has lower complexity than typical SPA applications but still offers more interactivy and flexibility than server side rendered web sites. _It works well with serverless application and a pub/sub data model_.

d--b is designed to be composable with other packages to build web sites. It takes the Lego approach, you select the packages for your needs, no lock-in into a single framework with a potential steep learning curve. d--b is build on standard browser supported technologies which means that you only need to read MDN as the source of knowledge.

d--b minimizes abstractions, just standard HTML, CSS and Javascript. Migrating from a SPA to d--b's multi page application (MPA) approach should mean you can do this one page at the time not having to migrate your whole system at once and pray that everything keeps working.

# Benefits

- Buildless web applications (minification is still possible of course) 👍
- Lightweight: **~4KB** 👍
- Benefit from standard web component encapsulation 👍
- Lazy load page content, when about to enter the viewport 👍
- Just standard web technologies, little abstractions 👍
- Composable with other packages
- Multi Page Application (MPA) design
  - The standard method how the web communicates between server and client 👍
  - Normal native routing 👍
  - Better SEO 👍
  - Each page loads what it needs and no more 👍
  - Fast initial draw 👍

# Examples

Please look in the **examples-external-templates.html** and the **examples-inpage-templates.html** for working examples

# How?

## Templates

Templates let you build complex systems and reuse components accross multiple pages, you can define templates in separate files or use them inline as a one-of if you just need the benefits of web components.

### External templates

index.html

```html

<html>
  <body>
    <my-component>Overwritten text</my-component>

    <script type="module">
      import initialize from '/d--b.js';
      await initialize(); // await if loading external templates
    </script>
  </body>
</html>

```

/components/my-component.html

```html

<div>
  <slot>Default text</slot>
</div>

<style>/* Scoped to the web component */</style>

```

### Internal templates

index.html

```html

<html>
  <body>
    <template id="my-component">
      <slot>Default</slot>
      <style>/* Scoped to the web component */</style>
    </template>

    <my-component>Overwrite</my-component>

    <script type="module">
      import initialize from '/d--b.js';
      initialize(); // No await needed for internal templates
    </script>
  </body>
</html>

```

_Note: When you use an internal `<template>` you need to define an id, which will be the name of the tag._

## Options

```js

/**
 * Options for initiating an instance
 * @param {string} [prefix=b] - Set the part before the '-', <b-yourtag></b-yourtag>
 * @param {string} [directory=/components] - Where components should be stored
 * @param {flat|tree} [structure=flat] - saves nested or at the root of directory,
 * @param {object.<string, string>} [aliases]- Map long tag names to shorter versions
 * @param {object.<string, string>} [keyValueAttributes]- Add key value attributes to known list
 * @param {object.<string, string>} [booleanAttributes]- Add boolean attributes to known list
 * @param {string[]} [attributeBlackList]- Attributes should not auto update
 **/

import initialize from 'd--b.js'
initialize({
  prefix: 'a',
  directory: '/components',
  // How files should be saved in the directory, files on disk use no prefix:
  // flat: <b-field-input>, saved as "/components/field-input.html"
  // tree: <b-field-input>, saved as "/components/field/input.html"
  structure: 'flat',
  // Use to shorten a name or rename it
  aliases: { 'some-very-long-tag-name': 'short-name' },
  // Assign key value attributes that you want to be automatically recognized
  // Property is the name of the attribute and the value is an array of tags
  // that should receive the property if added to <my-component newattr="2">
  keyValueAttributes: {
    newattr: ['div', 'input']
  },
  // Same as above, except that it is a binary attribute that doesn't have a
  // value like <my-component newattr>
  booleanAttributes: {
    newattr: ['div', 'input']
  },
  // Attributes in this list will not auto update, <my-component value=""> will
  // not be set on any children
  attributeBlackList: ['value']
});

```

## Methods

### .setSlot(value, [slotName], [htmlSelector])

```js
/**
 * Update data in a <slot> tag
 * @param {string} value - What you want to assign to a <slot>
 * @param {string} [slotName] - If not given value is assigned to default <slot>
 * @param {string} [htmlSelector] - Target a html tag in a complex <slot>
 **/

const element = document.querySelector('my-component');

// To default slot
element.setSlot('Some text');

// To slot named title
element.setSlot('Some text', 'title');

// To slot named title and withing the <em> tag
element.setSlot('Some text', 'title', 'em');

```

### .setChildren(data, [wrapperTag])

```js
/**
 * Updates one or more records in the child template
 * @param {object|object[]} data - The data to use
 **/

const element = document.querySelector('my-component');

// Update a single child, with data-slot named "title"
element.setChildren({ title: 'Some value' });

```

_Note: Child templates always need to extend an existing tag, like `<tr>`, `<option>`, `<div>`, etc. This is because some parents like `<tbody>`, `<select>` will not render regular non extended web components._

### .onceVisible(callback)

```js
/**
 * Runs one time when the web component comes into view
 * @param {function} callback - Callback to run
 **/
document.querySelector('my-component').onceVisible(element => {
  subscribeToData('someCollection', data => element.setChildren(data));
});

```

### .checkValidity() (Only if the webcomponent includes a form element)

```js
/**
 * Checks if the field is valid
 * @returns boolean
 **/
document.querySelector('my-form-field').checkValidity();

```

### .validity (Only if the webcomponent includes a form element)

```js
/**
 * Get the standard validity object
 * @returns ValidityState
 **/
document.querySelector('my-form-field').validity;

```

### .validationMessage() (Only if the webcomponent includes a form element)

```js
/**
 * Gets the message for an invalid field, handy for bespoke themes
 * @returns string
 **/
document.querySelector('my-form-field').validationMessage();

```

### Attributes

It is possible to set attributes on a web component instance tag like `<my-component>` and they will automatically be assigned to the correct nodes in the underlying `<template>`. Any changes you make to the `<my-component>` attributes will automatically update the underlying component data.

index.html

```html

<my-email data-id="1" value="me@me.com" readonly>User Email</my-email>

```

my-component.html

```html
<!--
  Custom attributes like data-id need to be defined in the template, otherwise
  d--b does not know where to assign the value
-->
<label data-id="">
  <slot></slot>
  <!-- d--b knows to add value and read only to the input field --->
  <input type="email" placeholder="email">
</div>

```

```js

// Calling from JS is also easier, you don't need to find the shadowRoot
const element = document.querySelector('my-component')
element.setAttribute('value', 'Some value');
element.disabled = true;

```

_Note: If there are multiple elements that can have an attribute that has been defined on the component instance it will assign it to all instances. You can assign attributes to the `<template>` tag but only if it extends an existing tag_

# FAQ

### How to pronounce d--b?
However you like

### No build steps is nice, but I want to use TypeScript
If you want to use TS you have a couple of options. You can either add a build step, nothing is stopping you, the library supports it. If you want to stay buildless but want to add some sort of type checking and hinting you can consider using JSDoc, it is [supported](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#author) in TS as well.

### Creating interactivity is verbose with native js DOM manipulation
d--b is not designed to be a single solution for everything, if you want to make DOM manipulation for interactivity easier I would suggest using dedicated libraries for that. You can consider [Alpine.js](https://alpinejs.dev/) or [Umbrella.js](https://umbrellajs.com/) for example. d--b is designed with composibility in mind so you decide what to add.

### External npm packages require me the add build steps again
You could load them from a CDN if you want to stay 100% buildless, otherwise you could just add a simple minifier and bundler. This will stay very lightweight but probably is more suitable for production environments.

### Anybody using web component technology?
Just check out the source code of github.com or youtube.com.

### We are a team of multiple developers, using a framework ensures we write similar code
You are correct, when you choose a more opinionated framework it will most likely give more cohesive code overall when you work with multiple developers. However it also gives you lock-in. It is a trade-off that you have to make, depending on the team size and how agile your codebase needs to remain.