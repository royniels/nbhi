import { getAttributeMapping, updateAttributes } from './attributes.js';
import update from './update.js';
import validate from './validate.js';
import onceVisible from './onceVisible.js';

export { initialize, update, validate, onceVisible };

async function initialize({ prefix = 'db', source = '/components' } = {}) {
  const registerCache = new Set();
  const fileCache = new Set();

  if (typeof prefix !== 'string' || prefix === '') {
    throw new Error('prefix option needs to be a string of at least one character');
  }

  const inheritedStylesheets = getInheritedStylesheets();
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
      register({ name, template });
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
          await fromFile(template.content);
          inPage(template.content, name);
          register({ name, template, script });

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
            throw new Error(`Could not find component ${ name }`);
          }
          const templateAsString = await response.text();
          const document = new DOMParser().parseFromString(templateAsString, 'text/html');
          return document.querySelector('body');
        }
      });

    return Promise.all(promises);
  }

  function register({ name, template, script }) {
    if (registerCache.has(name)) {
      return;
    }

    registerCache.add(name);

    const isFormControl = !!template.content.querySelector('input, select, textarea');
    const attributeMapping = getAttributeMapping(template.content);

    customElements.define(name, class extends HTMLElement {
      static observedAttributes = Object.keys(attributeMapping);
      static formAssociated = isFormControl;
      #shadow = null;

      constructor() {
        super();

        const clone = document.importNode(template.content, true);
        this.#shadow = this.attachShadow({ mode: 'open' });
        this.#shadow.adoptedStyleSheets = inheritedStylesheets;
        this.#shadow.appendChild(clone);

        if (isFormControl) {
          this.elementInternals = this.attachInternals();
          this.formElement = this.#shadow.querySelector('input, select, textarea');
        }
      }

      connectedCallback() {
        if (typeof script === 'function') {
          script(this, path => import(`${ window.location.origin }${ path }`));
        }
      }

      attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
          updateAttributes({ name, value: newValue, attributeMapping, root: this.#shadow });
        }
      }
    });
  };

  function getInheritedStylesheets() {
    return Array.from(document.styleSheets)
      .filter(sheet => sheet?.ownerNode?.dataset?.inherit === 'true')
      .map(sheet => {
        const newSheet = new CSSStyleSheet();
        try {
          const cssText = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
          newSheet.replaceSync(cssText);
        } catch (error) {
          error;
          console.error('Permission denied for sheet:', sheet.href);
        }
        return newSheet;
      });
  }
};
