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
    #observer = null;

    constructor() {
      super();

      const clone = document.importNode(template.content, true);
      this.usedAttributes = usedAttributes;

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

    updateAttribute({ name, oldValue, newValue, root }) {
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

  Object.keys(usedAttributes)
    .filter(key => Array.isArray(attributeMapping.boolean[key]))
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

  customElements.define(name, Component, extend ? { extends: extend } : undefined);
};