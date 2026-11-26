# NBHI

**Web components from plain HTML templates, without build tools**

NBHI (No-Build HTML Includes) turns HTML templates into [web components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components). You write a component as an HTML file, or as a `<template>` in your page, and NBHI defines it. The template says which parts of the component can change, and NBHI gives the component a property for each of them. You update a component by setting its properties, the same way you set `value` on an `<input>` or `src` on an `<img>`.

It does four things:

- **Loads components** from HTML files or inline templates, also when they are added to the page later.
- **Gives components properties** from bindings in their template.
- **Renders lists** into tables, lists and selects with one helper, `rows()`.
- **Makes components with a form field real form controls**, so forms, `FormData` and validation work like they do for native fields.

Everything else is standard HTML, CSS and JavaScript. If you know MDN, you know NBHI.

## Install

No build step is needed. Map the package in an import map and import it in a module script:

```html
<script type="importmap">
  { "imports": { "nbhi": "https://cdn.jsdelivr.net/npm/nbhi@1.0.1/javascript/index.js" } }
</script>

<script type="module">
  import { initialize } from 'nbhi';
  await initialize();
</script>
```

Or install it with `npm install nbhi`.

## Defining components

### Options

```js
initialize({
  prefix: 'nb',             // components are <nb-...> elements (the default)
  source: '/components',    // <nb-card> loads /components/card.html (the default)
});
```

With `prefix: 'app'`, the components are `<app-card>`, `<app-nav>` and so on.

`source` can also be a map from the name without the prefix to a file:

```js
initialize({
  source: {
    card: '/shared/components/card.html',
    nav: '/components/navigation.html',
  },
});
```

### A component in its own file

`/components/card.html`

```html
<article>
  <h2 nb-text="heading"></h2>
  <!-- A standard web component slot, NBHI doesn't touch it -->
  <slot></slot>
</article>

<style>
  /* Scoped to the component */
  h2 { margin: 0; }
</style>

<script type="module">
  import { format } from 'date-fns';
  import { getArticle } from 'articles';

  export default async element => {
    // Runs once for every instance, the first time it is added to the page.
    // element is the instance.
    const article = await getArticle(element.dataset.id);
    element.heading = `${ article.title } (${ format(article.published, 'yyyy') })`;
  };
</script>
```

The script's default export runs with the element. Its imports go through the page's import map, for packages and for your own modules alike:

```html
<script type="importmap">
  {
    "imports": {
      "nbhi": "https://cdn.jsdelivr.net/npm/nbhi@1.0.1/javascript/index.js",
      "date-fns": "https://esm.sh/date-fns@4.1.0",
      "articles": "/javascript/articles.js"
    }
  }
</script>
```

Use names from the import map or full URLs. A relative path (`./articles.js`) or a path from the root (`/javascript/articles.js`) doesn't work in a component script: NBHI runs it from a `blob:` URL, which has no folder to resolve such a path from.

The page uses it like any element:

```html
<nb-card heading="Getting started">A short introduction to web components.</nb-card>
```

### A component in the page

A `<template>` whose id starts with the prefix is a component. Other templates are left alone, so you can still use `<template>` for your own purposes.

```html
<template id="nb-badge">
  <span nb-text="label"></span>
  <style>span { font-weight: bold; }</style>
</template>

<nb-badge label="Draft"></nb-badge>
```

### Components added later

NBHI watches the page and the inside of every component. A component that a script adds later, with `append()`, `innerHTML` or inside another component, is loaded and defined as soon as it appears. To use it straight away, wait until it is defined:

```js
list.insertAdjacentHTML('beforeend', '<nb-card></nb-card>');
await customElements.whenDefined('nb-card');
```

### Sharing page styles

A component's styles are scoped to it. To let every component use a stylesheet of the page too (a CSS framework, your typography), mark it with `data-inherit`:

```html
<link rel="stylesheet" href="/stylesheets/pico.css" data-inherit="true">
```

NBHI reads it once and shares it with every component.

## Properties

The template decides what can change. Two bindings create properties:

| Binding | What the property sets |
| --- | --- |
| `nb-text="heading"` | the text of the element |
| `:href="link"` | the `href` of the element (any attribute works: `:src`, `:disabled`, `:data-state`, ...) |

Everything NBHI reads in a template starts with `nb-` or `:`. `data-*` attributes are never NBHI syntax, they stay yours.

```html
<template id="nb-author">
  <h2 nb-text="name"></h2>
  <a :href="link">Open profile</a>
  <img :src="photo" :alt="name">
</template>
```

```js
const author = document.querySelector('nb-author');
author.name = 'Jane Doe';             // the heading, and the alt of the image
author.link = '/authors/jane-doe';
author.photo = '/images/jane-doe.jpg';
```

### One name, every element that uses it

A property updates every element that binds it. In the example above `name` sets both the heading and the `alt` of the image.

Elements that have the same attribute with a different meaning get different names. Nothing collides, because the page never uses the native attribute name:

```html
<template id="nb-period">
  <input type="date" :value="start" :min="earliest">
  <input type="date" :value="end" :min="start">
  <button :disabled="locked">Apply</button>
</template>
```

```js
period.start = '2024-01-01';   // the first input, and the minimum of the second
period.end = '2025-12-31';
period.locked = true;
```

### Values

- `true` sets an attribute without a value (`disabled`), `false`, `null` and `undefined` remove it.
- `null` and `undefined` empty the text of an `nb-text` element.
- On form fields, `:value`, `:checked` and `:selected` set the property, not the attribute. The attribute is only the starting value of a field, the property is what it shows.
- On another component, a binding sets that component's property, so values can be any type (see Nested components).
- Reading a property gives back the last value that was set.

### Text, not HTML

`nb-text` sets text. Markup in your data is shown as text, never run, so user input can't add elements or scripts to your page.

When you do want HTML, from a source you trust, use `nb-html`:

```html
<div nb-html="description"></div>
```

### Properties as attributes

Every property can also be set as an attribute in the page's HTML. A camelCase property is a kebab-case attribute:

```html
<nb-period start="2024-01-01" end="2025-12-31" locked></nb-period>
```

```js
period.setAttribute('start', '2024-06-01');   // the same as period.start = '2024-06-01'
```

Attributes are always strings, properties keep their type. Use properties for numbers, arrays and objects.

### Before a component is defined

A component file loads asynchronously. Properties set before that keep their value: NBHI applies them once the component is defined, so this works:

```js
const card = document.createElement('nb-card');
card.heading = 'Getting started';
document.body.append(card);
```

### What is not a property

A component only has the properties its template binds. Every other attribute stays on the component element itself and does what it does on any element:

- `hidden`, `class`, `id`, `style`, `title`, `slot`, `lang`, `dir`, `role`, `aria-*` and other global attributes apply to the component as a whole. `hidden` always hides it, also when its CSS sets `display`.
- `data-*` attributes stay yours, read them with `element.dataset`.
- Attributes that only change the look need no binding. Select them in the component's CSS:

```css
:host([variant="danger"]) { --badge-color: crimson; }
```

To pass one of these to an element inside, bind it: `<input :aria-label="label">`.

A binding can't use a name that every element already has as a property, like `title`, `hidden`, `id` or `style`: NBHI throws when it defines the component. Use `nb-text="heading"` instead of `nb-text="title"`. In a list row this doesn't matter, as the bindings read from the record.

## Nested components

A binding on a component inside a template sets that component's property. That is how a component passes a value on:

```html
<template id="nb-article-card">
  <h2 nb-text="heading"></h2>
  <nb-badge :label="status"></nb-badge>
</template>
```

```js
card.status = 'Draft';   // sets the label of the badge inside
```

You set the outer property and the template passes it on. The page never reaches into a component.

## Refs

Sometimes a page needs an element inside a component itself, for example to measure it or to hand it to a library. Name it with `nb-ref`:

```html
<template id="nb-map">
  <div nb-ref="canvas"></div>
</template>
```

```js
new google.maps.Map(document.querySelector('nb-map').refs.canvas, { zoom: 8 });
```

`refs` is the way into a component. If you use it to change content or attributes, add a property instead.

## Events

Listen to a component the way you listen to a native element: add the listener to the component itself.

```js
const select = document.querySelector('nb-select');

select.addEventListener('change', () => {
  console.log(select.value);
});
```

### Events from the elements inside

When a user clicks, types or presses a key on an element inside a component, the event reaches the page as if the component itself fired it. `event.target` is the component, not the element inside, so the page never needs to know how the component is built.

The browser does this for most events, like `click`, `input` and `keydown`. It doesn't for `change`: that event stays inside the component. NBHI fires it again from the component, so `change` works like the others.

### Your own events

A component's script can fire its own events. Dispatch them on the component element, with `bubbles: true` so that a listener on a parent hears them too:

`/components/tag.html`

```html
<span nb-text="label"></span>
<button nb-ref="remove">×</button>

<script type="module">
  export default element => {
    element.refs.remove.addEventListener('click', () => {
      element.dispatchEvent(new CustomEvent('remove', { bubbles: true, detail: { label: element.label } }));
    });
  };
</script>
```

One listener on the parent handles every tag in it:

```html
<div class="tags">
  <nb-tag label="html"></nb-tag>
  <nb-tag label="css"></nb-tag>
</div>
```

```js
document.querySelector('.tags').addEventListener('remove', event => {
  event.target.remove();
});
```

## Lists

`rows()` renders a list of records into an element. The first element in it is the template for a row:

```html
<table class="articles">
  <thead>
    <tr><th>Title</th><th>Status</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><a :href="link" nb-text="title"></a></td>
      <td><nb-badge :label="status"></nb-badge></td>
    </tr>
  </tbody>
</table>
```

```js
import { rows } from 'nbhi';

const table = document.querySelector('.articles');
const articles = await fetch('/api/articles').then(response => response.json());

rows(table, articles.map(({ id, title, status }) => ({
  id,
  title,
  status,
  link: `/articles/${ id }`,
})));
```

Call `rows()` again with new data whenever it changes, for example from a polling loop, a WebSocket or a realtime database listener.

Inside a row, the bindings read from the record. The same bindings work as in a component: `nb-text`, `nb-html`, `:attribute` and bindings on components.

### Where the rows go

| Element | Rows | Template |
| --- | --- | --- |
| `<table>` | the `<tr>`s of its `<tbody>` | the first `<tr>` of the `<tbody>` |
| `<ul>`, `<ol>` | `<li>`s | the first `<li>` |
| `<select>` | `<option>`s | the first `<option>` |
| any other element | its children | its first child |

NBHI takes the template out of the page the first time and keeps it, so you write the row once in your HTML.

### Keeping rows

Rows are matched to records by `id`. A record whose `id` was already shown keeps its element, even when it is a new object (as it is every time data is loaded again). The element is updated in place and moved when the order changes, so open details, a typed value and any element a test is holding all stay. Records without an `id` are matched by position.

Every call renders every record again, so a record that changed in place shows its new values. A key that is missing from a record empties its binding.

Each element keeps its own list. Calling `rows()` again on the same element, from anywhere, continues with the rows that are already there.

### Records that are strings or numbers

A string or number is used as `{ id: value, value }`:

```html
<ul class="tags"><li nb-text="value"></li></ul>
```

```js
rows(document.querySelector('.tags'), ['html', 'css', 'javascript']);
```

### Doing more per row

For what a binding can't do, like an event listener, pass a function. It runs for every row after the bindings are applied:

```js
rows(table, articles, (row, record) => {
  row.querySelector('button').onclick = () => archive(record.id);
});
```

### Lists inside a component

In a template, `nb-each` makes a property that takes a list:

```html
<template id="nb-select">
  <label>
    <span nb-text="label"></span>
    <select :value="value" nb-each="options">
      <option :value="value" nb-text="label"></option>
    </select>
  </label>
</template>
```

```js
const select = document.querySelector('nb-select');
select.label = 'Reviewer';
select.options = users.map(({ id, name }) => ({ value: id, label: name }));
select.value = 'u-123';
```

Inside the row (here the `<option>`), the bindings read from each record. Outside it, they read from the component.

## Forms

A component with an `<input>`, `<select>` or `<textarea>` is a form control. It works in a `<form>` like the field itself:

```html
<template id="nb-input">
  <label>
    <span nb-text="label"></span>
    <input :value="value" :required="required" :placeholder="placeholder">
  </label>
</template>

<form>
  <nb-input name="title" label="Title" required></nb-input>
  <button>Save</button>
</form>
```

```js
const form = document.querySelector('form');
const title = form.querySelector('nb-input');

title.value = 'Getting started';         // shown in the input
new FormData(form).get('title');    // 'Getting started'
form.reportValidity();              // checks the input inside, shows its message
```

- **The field:** the element marked `nb-ref="field"`, or else the first `input`, `select` or `textarea`.
- **`name`** on the component is the name in the form.
- **`value`** on the component reads and sets the field. For a checkbox or radio, use `checked`.
- **The form value** is updated on every `input` and `change`, so `FormData` and submitting always have the current value.
- **Validation:** the field's own validity (`required`, `min`, `pattern`, `type="email"`, ...) is the component's validity, with the browser's messages. `checkValidity()`, `reportValidity()`, `validity` and `:invalid` work on the component.
- **Reset:** resetting the form puts the field back to its starting value.
- **Disabled:** a disabled `<fieldset>` disables the field.
- **Focus:** `component.focus()` focuses the field, and clicking its label does too.

## Reference

```js
import { initialize, rows } from 'nbhi';
```

| Export | What it does |
| --- | --- |
| `initialize({ prefix, source })` | Defines the components in the page and loads the ones added later. Resolves when the components in the page are defined. |
| `rows(element, records, each)` | Renders `records` into `element`, matched by `id`. `each(row, record)` is optional. |

In templates:

| Markup | Meaning |
| --- | --- |
| `<template id="nb-name">` | a component in the page |
| `nb-text="name"` | property `name` sets the text of this element |
| `nb-html="name"` | property `name` sets the HTML of this element |
| `:attribute="name"` | property `name` sets this attribute, or this property on form fields and components |
| `nb-each="name"` | property `name` takes a list, the first child is the row |
| `nb-ref="name"` | `component.refs.name` is this element |

## Upgrading from 0.x

| 0.x | Now |
| --- | --- |
| Default prefix `db` | Default prefix `nb`, pass `prefix: 'db'` to keep the old names |
| `export default (element, importer) => {}` and `await importer('/path.js')` | `export default element => {}`, import your modules through the import map |
| `<template>` without an id inside a component became `<parent>-child` | Only a `<template id="<prefix>-...">` is a component |
| `update(element)('text')` on a plain element | `element.textContent = 'text'` |
| `update(link)({ $href: url })` on a plain element | `link.href = url` |
| `update(table)(records)` | `rows(table, records)` |
| `data-slot="name"` in a row | `nb-text="name"` |
| `update(component)({ heading })`, which added `<span slot="heading">` to the component | `component.heading = heading`, with `nb-text="heading"` in the template instead of `<slot name="heading">`. Slots now only take content the page writes in its HTML |
| `update(component)({ $checked: true })` | `component.checked = true`, with `:checked="checked"` in the template |
| Attributes passed inward automatically | Bind them: `<input :required="required">` |
| `validate(component)` | Not needed: validity is kept up to date. Use `component.checkValidity()` |
| `onceVisible(element, callback)` | Removed. Use an [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver) |
| `component.shadowRoot.querySelector(...)` | A property, or `component.refs.name` |
| `[child]` element for lists in a component | `nb-each="name"` on the list's parent |
| Values inserted as HTML | Values are text, use `nb-html` for HTML |
