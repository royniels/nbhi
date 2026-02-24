const baseClasses = {
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

const definitions = {};

export { register, getDefinition };

function getDefinition(name) {
  return definitions[name];
}

function register({ name, template, usedAttributes, script, attributeMapping }) {
  if (definitions[name]) {
    return;
  }

  const extend = template.getAttribute('extends') ?? false;
  const isFormControl = !!template.content.querySelector('input, select, textarea') && !extend;
  const BaseClass = baseClasses[extend] ? baseClasses[extend] : HTMLElement;
  definitions[name] = { extend, usedAttributes };

  const Component = class extends BaseClass {
    static observedAttributes = Object.keys(usedAttributes);
    static formAssociated = isFormControl;
    #shadow = null;

    constructor() {
      super();

      const clone = document.importNode(template.content, true);
      if (extend) {
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
      const root = extend ? this : this.#shadow;
      try {
        if (oldValue === newValue) {
          return;
        }

        const tagsToApplyTo = usedAttributes[name] ?? [];
        const isBoolean = Array.isArray(attributeMapping.boolean[name]);
        const isKeyValue = Array.isArray(attributeMapping.keyValue[name]);
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
  };

  customElements.define(name, Component, extend ? { extends: extend } : undefined);
};