export default async ({ prefix = 'db', source = '/components', attributes = {} } = {}) => {
  const registerCache = new Set();
  const fileCache = new Set();
  const attributeMapping = getAttributeMapping();

  if (typeof source !== 'string' || !Object.keys(source).length) {
    throw new Error('source option needs to be a string or an object');
  }

  if (typeof prefix !== 'string' || prefix === '') {
    throw new Error('prefix option needs to be a string of at least one character');
  }

  inPage(document.querySelector('body'));
  await fromFile(document.querySelector('body'));

  function inPage(root, parentId) {
    root.querySelectorAll('template').forEach(template => {
      if (!template.id && parentId) {
        template.id = `${ parentId }-child`;
      }

      if (!template.id) {
        console.log(template, parentId);
        throw new Error('<template> is missing a mandatory id field');
      }

      inPage(template.content, template.id);
      const name = template.id;
      const usedAttributes = getUsedAttributes(template);
      register({ name, template, usedAttributes });
    });
  }

  function fromFile(root) {
    const promises = [...root.querySelectorAll(':not(:defined)')]
      .filter(element => {
        const tagName = element.localName;
        return element.nodeType === 1 && tagName.includes('-') && tagName.startsWith(prefix);
      })
      .map(async element => {
        const name = element.localName;
        if (!fileCache.has(name)) {
          fileCache.add(name);
          const html = await fetchFromFile(name);
          const template = document.createElement('template');
          template.content.append(...html.children);
          const script = await copyScript(template);
          await fromFile(root);
          inPage(template.content, name);
          const usedAttributes = getUsedAttributes(template);
          register({ name, template, usedAttributes, script });

          function copyScript(template) {
            const script = template.content.querySelector('script');
            return new Promise(async resolve => {
              if (script) {
                const blob = new Blob([script.textContent], { type: 'text/javascript' });
                const blobUrl = URL.createObjectURL(blob);
                resolve((await import(blobUrl)).default);
                URL.revokeObjectURL(blobUrl);
              } else {
                resolve({});
              }
            });
          }
        };

        async function fetchFromFile(name) {
          const fileName = name.split('-').slice(1).join('-');
          const relativePath = typeof source === 'string'
            ? `${ source }/${ fileName }.html` : source[fileName];
          const response = await fetch(relativePath);
          if (!response.ok) {
            throw new Error(`Could not find component @ ${ relativePath }`);
          }
          const templateAsString = await response.text();
          const document = new DOMParser().parseFromString(templateAsString, 'text/html');
          return document.querySelector('body');
        }
      });

    return Promise.all(promises);
  }

  function getUsedAttributes(template) {
    const { keyValue, excludedAttributes, excludedElements, boolean: binary } = attributeMapping;
    const results = {};
    traverse(template.content);
    return results;

    function traverse(element) {
      const tagName = element.localName;
      if (
        element &&
        typeof tagName === 'string' &&
        !excludedElements.includes(element.localName)
      ) {
        Object
          .entries(binary)
          .filter(([key]) => !excludedAttributes.includes(key))
          .filter(([, elements]) => elements.includes(tagName))
          .forEach(([key, elements]) => results[key] = { type: 'boolean', elements });

        Object
          .entries(keyValue)
          .filter(([key]) => !excludedAttributes.includes(key))
          .filter(([, elements]) => elements.includes(tagName))
          .forEach(([key, elements]) => results[key] = { type: 'keyValue', elements });

        if (element.hasAttributes()) {
          [...element.attributes].forEach(attribute => {
            const name = attribute.name;
            if (!excludedAttributes.includes(name)) {
              if (!results[name]) {
                results[name] = { type: 'userDefined', elements: [] };
              }

              if (!results[name].elements.includes(tagName)) {
                results[name].elements.push(tagName);
              }
            }
          });
        }
      }
      [...element.children].forEach(child => traverse(child));
    }
  }

  function getAttributeMapping() {
    const mapping = {
      boolean: {
        autofocus: ['button', 'input', 'select', 'textarea'],
        autoplay: ['audio', 'video'],
        checked: ['input'],
        controls: ['audio', 'video'],
        default: ['track'],
        defer: ['script'],
        disabled: ['button', 'input', 'optgroup', 'option', 'select', 'textarea', 'fieldset'],
        formnovalidate: ['button', 'input'],
        ismap: ['img'],
        loop: ['audio', 'video'],
        multiple: ['input', 'select'],
        muted: ['audio', 'video'],
        novalidate: ['form'],
        open: ['details', 'dialog'],
        playsinline: ['video'],
        readonly: ['input', 'textarea'],
        required: ['input', 'select', 'textarea'],
        reversed: ['ol'],
      },
      keyValue: {
        accept: ['input'],
        autocomplete: ['input', 'select', 'textarea'],
        cols: ['textarea'],
        dirname: ['input', 'textarea'],
        max: ['input'],
        maxlength: ['input', 'textarea'],
        min: ['input'],
        minlength: ['input', 'textarea'],
        name: ['input', 'select', 'textarea'],
        pattern: ['input'],
        placeholder: ['input', 'textarea'],
        rows: ['textarea'],
        size: ['input', 'select'],
        step: ['input'],
        type: ['input'],
        value: ['input', 'select'],
        width: ['input'],
        wrap: ['textarea'],
        htmlFor: ['label'],
        for: ['label'],
        href: ['a'],
        src: ['audio', 'img', 'input', 'video'],
      },
      excludedAttributes: ['class', 'extends', 'id', 'part', 'data-slot', 'child'],
      excludedElements: ['slot', 'template', 'style', 'script'],
    };

    Object.entries(attributes).forEach(([key, { excluded = false, type, elements = [] }]) => {
      if (excluded === true) {
        mapping.excludedAttributes = [...new Set([...mapping.excludedAttributes, key])];
      } else if (type === 'boolean' && Array.isArray(elements)) {
        merge(mapping.boolean);
      } else if (type === 'keyValue' && Array.isArray(elements)) {
        merge(mapping.keyValue);
      }

      function merge(source) {
        if (!Array.isArray(source[key])) {
          source[key] = elements;
        } else {
          source[key] = [...new Set([...source[key], ...elements])];
        }
      }
    });

    return mapping;
  }

  function register({ name, template, usedAttributes, script }) {
    if (registerCache.has(name)) {
      return;
    }

    registerCache.add(name);
    console.log(name, usedAttributes);

    const isFormControl = !!template.content.querySelector('input, select, textarea');

    customElements.define(name, class extends HTMLElement {
      static observedAttributes = Object.keys(usedAttributes);
      static formAssociated = isFormControl;
      #shadow = null;

      constructor() {
        super();

        const clone = document.importNode(template.content, true);
        this.#shadow = this.attachShadow({ mode: 'open' });
        this.#shadow.appendChild(clone);

        if (isFormControl) {
          this.elementInternals = this.attachInternals();
          this.formElement = this.#shadow.querySelector('input, select, textarea');
        }
      }

      connectedCallback() {
        if (typeof script === 'function') {
          script(this);
        }
      }

      attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) {
          return;
        }

        const { type, elements } = usedAttributes[name] ?? [];

        const update = element => {
          if (element) {
            if (
              newValue === null ||
              newValue === undefined ||
              (type === 'boolean' && newValue === false)
            ) {
              element.removeAttribute(name);
            } else {
              element.setAttribute(name, newValue);
              // Triggers <select> to update the selected <option>
              if (name === 'value') {
                element.value = newValue;
              }
            }
          }
        };

        if (type === 'userDefined') {
          update(this.#shadow.querySelector(`[${ name }]`));
        } else {
          elements.forEach(element => {
            this.#shadow.querySelectorAll(element).forEach(update);
          });
        }
      }
    });
  };
};
