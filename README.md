# What?

**HTML includes and reactive rendering, all without any build tools**

No-build HTML includes (NBHI) is a simple **3.9KB** library that allows you to include html files into other html files and turns them into [web components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components). Lazy initialization of content (when entering the viewport) and a one line call to update/hydrate content and attributes in your html pages. No build tools required, no `package.json` needed.

# Why?

NBHI is developed to create real-time data driven web sites. It has lower complexity than typical SPA applications but still offers more interactivy and flexibility than server side rendered web sites. _It works well with serverless application and a pub/sub data model_.

NBHI is designed to be composable with other packages to build web sites. It takes the Lego approach, you select the packages for your needs, no lock-in into a single framework with a potential steep learning curve. NBHI is build on standard browser supported technologies which means that you only need to read MDN as the source of knowledge.

NBHI minimizes abstractions, just standard HTML, CSS and Javascript. Migrating from a SPA to NBHI's multi page application (MPA) approach should mean you can do this one page at the time not having to migrate your whole system at once and pray that everything keeps working.

# Benefits

- No-build web applications (you can still make it a dependency via npm install) 👍
- Lightweight: **~3.9KB** (minified and bundled) 👍
- No dependencies 👍
- Benefit from standard web component encapsulation 👍
- Lazy load page content, when about to enter the viewport 👍
- Just standard web technologies, little abstractions 👍
- Simple single function to hydrate your html (including attributes) 👍
- Support for form validation for web component based html fields 👍
- Composable with other packages 👍
- Multi Page Application (MPA) design
  - The standard method how the web communicates between server and client 👍
  - Normal native routing 👍
  - Better SEO 👍
  - Each page loads what it needs and no more 👍
  - Fast initial draw 👍

# Install

For no-build solutions:

```js
<script type="module">
  import { initialize } from 'https://esm.run/nbhi@x.x.x';
  await initialize();
</script>
```

For build solutions

```cli
npm install nbhi
```

# Examples

Please look in the **examples.html** for working examples.

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
      import initialize from '/NBHI.js';
      await initialize(); // await if external templates
    </script>
  </body>
</html>
```

/components/component.html

```html
<div>
  <slot>Default text</slot>
</div>

<style>/* Scoped to the web component */</style>

<script>
  // Runs for each instance, fires on the standard connectedCallback
  // element is the web component instance
  export default element => {
    ...
  }
</script>
```

### Internal templates

index.html

```html
<html>
  <body>
    <!-- id becomes the name of your web component -->
    <template id="my-component">
      <slot>Default</slot>
      <style>/* Scoped to the web component */</style>
    </template>

    <my-component>Overwrite</my-component>

    <script type="module">
      import initialize from '/NBHI.js';
      initialize(); // No await needed for internal templates
    </script>
  </body>
</html>
```

## Options

```js
initialize({ prefix = 'my', directory = '/components' }); // Defaults
```

```js
initialize({ prefix: 'x' }); // Components are now x-component
```

```js
initialize({ components: '/abc' }); // Fetches files in /abc/component.html
```

```js
// key = name of component (no prefix), value is path to file
initialize({ components: {
  nav: '/shared/nav.html',
  dropdown: '/components/dropdown.html'
} });
```

## Update a single component (data and attributes)

### Via HTML

```html
<!-- Instance -->
<my-component checked data-id="1">
  Text here will be assigned to the default slot
  <span slot="title">Will be assigned to the named slot</span>
</my-component>

<!-- Component definition -->
<section data-id=""> <!-- Data and custom attributes need to be defined so NBHI can resolve them -->
  <input type="checkbox"> <!-- NBHI automatically maps common attributes, checked will be placed on the input -->
  <slot>Default text</slot>
  <slot name="title">Default title</slot>
</section>
```

### Via JS

```js
import { update } from 'nbhi';

const updater = update('my-component');

updater('Text here will be assigned to the default slot');
updater({ title: 'Will be assigned to the named slot' });
updater({ $checked: true, `$data-id`: 1 }); // Atributes are prefixed with $
```

## Update a list (data and attributes)

### Inline child

/components/component.html

```html
<div>
  <h1><slot>Header</slot></h1>
  <div child> <!-- NBHI uses child attribute to make clones from -->
    <p data-slot="name"></p> <!-- use data-slot for inline children -->
  </div>
</div>
```

index.html

```html
<my-component>Header overwrite</my-component>

<script>
  import { initialize, update } from 'nbhi';
  await initialize();
  update('my-component')([
    { name: 'Record 1' },
    { name: 'Record 2' },
  ]);
</script>
```

### Child component

/components/component.html

```html
<div>
  <h1><slot>Header</slot></h1>
  <my-child child></my-child> <!-- NBHI uses child attribute to make clones from -->
</div>
```

/components/child.html

```html
<div>
  <p><slot></slot></p> <!-- use regular slot for nested components -->
</div>
```

index.html

```html
<my-component>Header overwrite</my-component>

<script>
  import { initialize, update } from 'nbhi';
  await initialize();
  update('my-component')([
    { name: 'Record 1' },
    { name: 'Record 2' },
  ]);
</script>
```

### List data for `<table>, <ol>, <li> and <option>`

These elements do not support web component children. So for these you can just define the following

index.html

```html
<template id="my-table">
  <table>
    <thead>
      <tr>
        <th>Header</th>
      </tr>
    </thead>
    <tbody> <!-- Required -->
      <tr> <!-- No need for child attribute -->
        <td data-slot="name"></td>
      </tr>
    </tbody>
  </table>
</template>

index.html

<my-table></my-table>

<script>
  import { initialize, update } from 'nbhi';
  await initialize();
  update('my-table')([
    { name: 'Record 1' },
    { name: 'Record 2' },
  ]);
</script>
```

Some logic for `<ol>`, `<ul>` and `<option>`

## Lazy loading

```js
import { onceVisible } form 'nbhi';

onceVisible('my-component', element => ...); // Will run once it comes in view (200px before)
```

## Validating a form field

```js
import { validate } form 'nbhi';

const internals = validate('my-form-field'); // Returns elementInternals

// See MDN for details
internals.checkValidity();
internals.validity;
```

## FAQ

### No build steps is nice, but I want to use TypeScript

If you want to use TS you have a couple of options. You can either add a build step, nothing is stopping you, the library supports it. If you want to stay buildless but want to add some sort of type checking and hinting you can consider using JSDoc, it is [supported](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#author) in TS as well.

### Creating interactivity is verbose with native js DOM manipulation

NBHI is not designed to be a single solution for everything, if you want to make DOM manipulation for interactivity easier I would suggest using dedicated libraries for that. You can consider [Alpine.js](https://alpinejs.dev/) or [Umbrella.js](https://umbrellajs.com/) for example. NBHI is designed with composibility in mind so you decide what to add.

### Anybody using web component technology?

Just check out the source code of github.com or youtube.com.

### We are a team of multiple developers, using a framework ensures we write similar code

You are correct, when you choose a more opinionated framework it will most likely give more cohesive code overall when you work with multiple developers. However it also gives you lock-in. It is a trade-off that you have to make, depending on the team size and how agile your codebase needs to remain.
