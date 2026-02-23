import attributeMapping from './attributeMapping.js';

export { register };

const cache = new Set();

function register(name, template, usedAttributes, script) {
  if (cache.has(name)) {
    return;
  }

  cache.add(name);

  const extendsTag = template.getAttribute('extends') || null;
  const isExtended = !!extendsTag;
  const mapping = attributeMapping();
  const isFormControl = !!template.content.querySelector('input, select, textarea') && !isExtended;

  if (checkSlots()) {
    console.log(template);
    throw new Error(
      'Found named and unnamed slots. Use only named slots or just a single unnamed slot'
    );
  }

  const BaseClass = isExtended
    ? getExtendedBaseClass(extendsTag)
    : HTMLElement;

  const Component = class extends BaseClass {
    static observedAttributes = Object.keys(usedAttributes);
    static formAssociated = isFormControl;

    #shadow = null;
    #observer = null;
    #childKeyMap = new Map();
    #recordIdentity = new WeakMap();
    #nextIdentity = 1;

    constructor() {
      super();

      const clone = document.importNode(template.content, true);
      this.usedAttributes = usedAttributes;

      if (isExtended) {
        this.appendChild(clone);
      } else {
        this.#shadow = this.attachShadow({ mode: 'open' });
        this.#shadow.appendChild(clone);
      }

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
      const root = this.#shadow || this;
      this.updateAttribute({ name, oldValue, newValue, root });
    }

    onceVisible(callback) {
      if (!this.#observer) {
        this.#observer = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting) {
            callback(this);
            this.#observer.disconnect();
            this.#observer = null;
          }
        });
        this.#observer.observe(this);
      }
    }

    setSlot(text, selector, subSelector) {
      const slots = Array.from(this.#shadow.querySelectorAll('slot'));
      const unnamedSlot = slots.find(slot => !slot.hasAttribute('name'));

      if (unnamedSlot) {
        hydrate(this);
      } else if (selector) {
        let slot = this.querySelector(`[slot="${ selector }"]`);
        if (!slot) {
          slot = document.createElement('span');
          slot.setAttribute('slot', selector);
          this.append(slot);
        }
        hydrate(slot, subSelector);
      }

      function hydrate(target, selector) {
        if (selector) {
          const sub = target.querySelector(selector);
          if (sub && sub.textContent !== text) {
            sub.textContent = text;
          }
        } else if (target.textContent !== text) {
          target.textContent = text;
        }
      }
    }

    setChildren(data) {
      const id = `${ this.tagName.toLowerCase() }-child`;
      const records = Array.isArray(data) ? data : [data];
      const template = this.#shadow.querySelector(`#${ id }`);
      const parent = template.parentNode;
      const { extendsTag } = customElements.get(id);

      if (!extendsTag) {
        throw new Error('A child template needs to extend an existing tag');
      }

      if (!parent) {
        throw new Error('Cannot find container to add children to, please supply "childContainerSelector"');
      }

      const newChildren = [];
      const newKeyMap = new Map();

      const getIdentity = (record, index) => {
        if (record && typeof record === 'object') {
          if (!this.#recordIdentity.has(record)) {
            this.#recordIdentity.set(record, this.#nextIdentity++);
          }
          return this.#recordIdentity.get(record);
        }
        return `p:${ record }:${ index }`;
      };

      records.forEach((record, index) => {
        const identity = getIdentity(record, index);
        let child = this.#childKeyMap.get(identity);

        if (!child) {
          child = document.createElement(extendsTag, { is: id });

          const templateAttributes = Object.entries(child.usedAttributes)
            .filter(([, value]) => value.includes('template'))
            .map(([key]) => key);

          templateAttributes.forEach(name => child.setAttribute(name, ''));
          parent.append(child);
        }

        if (child.cachedRecordData !== record) {
          if (record && typeof record === 'object') {
            Object.entries(record).forEach(([key, value]) => hydrate(child, key, value));
          } else {
            hydrate(child, null, record);
          }
          child.cachedRecordData = record;
        }

        newChildren.push(child);
        newKeyMap.set(identity, child);

        function hydrate(child, key, value) {
          if (key && key.startsWith('$')) {
            child.updateAttribute({ name: key.slice(1), newValue: value, root: child });
          } else {
            const slot = child.querySelector(`[data-slot="${ key }"]`);
            if (slot && slot.textContent !== value) {
              slot.textContent = value;
            }
          }
        }
      });

      // remove stale children
      for (const [identity, child] of this.#childKeyMap.entries()) {
        if (!newKeyMap.has(identity)) {
          child.remove();
        }
      }

      // reorder DOM to match new order
      newChildren.forEach((child, index) => {
        const current = parent.children[index];
        if (current !== child) {
          parent.insertBefore(child, current || null);
        }
      });

      this.#childKeyMap = newKeyMap;
    }

    updateAttribute({ name, oldValue, newValue, root }) {
      try {
        if (oldValue === newValue) {
          return;
        }

        const tagsToApplyTo = usedAttributes[name] ?? [];
        const isBoolean = Array.isArray(mapping.boolean[name]);
        const isKeyValue = Array.isArray(mapping.keyValue[name]);
        const isUserDefined = !isBoolean && !isKeyValue;
        const update = element => {
          if (element) {
            if (
              newValue === null ||
              newValue === undefined ||
              (isBoolean && newValue === false)
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

        if (isUserDefined) {
          if (root.hasAttribute(name)) {
            update(root);
          }
          update(root.querySelector(`[${ name }]`));
        } else {
          tagsToApplyTo.forEach(tag => {
            root.querySelectorAll(tag).forEach(update);
          });
        }
      } catch (error) {
        console.log({ name, oldValue, newValue, root });
        console.warn(error);
      }
    }

    // Too long and too short is only set when the actual input is changed, so we do it here
    updateFormField() {
      if (isFormControl) {
        const element = this.formElement;
        const value = element.value;
        const minlength = element.getAttribute('minlength');
        const maxlength = element.getAttribute('maxlength');
        const validity = {
          valueMissing: element.validity.valueMissing,
          typeMismatch: element.validity.typeMismatch,
          patternMismatch: element.validity.patternMismatch,
          rangeUnderflow: element.validity.rangeUnderflow,
          rangeOverflow: element.validity.rangeOverflow,
          stepMismatch: element.validity.stepMismatch,
          badInput: element.validity.badInput,
          customError: element.validity.customError,
          tooShort: minlength ? value.length < parseInt(minlength) : false,
          tooLong: maxlength ? value.length > parseInt(maxlength) : false,
        };
        this.elementInternals.setFormValue(value);
        this.elementInternals.setValidity(validity, message(), element);

        function message() {
          if (validity.tooShort) {
            return `The text needs to be at least ${ minlength } characters long`;
          } else if (validity.tooLong) {
            return `The text needs to be at most ${ maxlength } characters long`;
          } else if (element.validationMessage) {
            return element.validationMessage;
          }
          return 'The value is invalid';
        }
      }
    }
  };

  Component.extendsTag = extendsTag;

  Object.keys(usedAttributes)
    .filter(key => Array.isArray(mapping.boolean[key]))
    .forEach(key => {
      Object.defineProperty(Component.prototype, key, {
        get() {
          return this.hasAttribute(key);
        },
        set(value) {
          this.toggleAttribute(key, !!value);
        }
      });
    });

  if (isFormControl) {
    Object.defineProperties(Component.prototype, {
      checkValidity: {
        value: function () {
          this.updateFormField();
          return this.elementInternals?.checkValidity();
        }
      },
      validationMessage: {
        value: function () {
          return this.elementInternals?.validationMessage;
        }
      },
      validity: {
        get() {
          return this.elementInternals?.validity;
        }
      },
    });
  }

  if (isExtended) {
    customElements.define(name, Component, { extends: extendsTag });
  } else {
    customElements.define(name, Component);
  }

  function checkSlots() {
    const slots = Array.from(template.content.querySelectorAll('slot'));
    const unnamed = slots.find(slot => !slot.hasAttribute('name'));
    return unnamed && slots.length > 1;
  }

  function getExtendedBaseClass(tag) {
    const map = {
      tr: HTMLTableRowElement,
      td: HTMLTableCellElement,
      th: HTMLTableCellElement,
      li: HTMLLIElement,
      ul: HTMLUListElement,
      ol: HTMLOListElement,
      button: HTMLButtonElement,
      option: HTMLOptionElement,
      input: HTMLInputElement,
      select: HTMLSelectElement,
      textarea: HTMLTextAreaElement,
      a: HTMLAnchorElement,
      img: HTMLImageElement,
      form: HTMLFormElement,
      div: HTMLDivElement,
    };

    return map[tag] || HTMLElement;
  }
}