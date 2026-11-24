import { collect, apply, toAttribute, toProperty } from './render.js';

export { define };

const states = new WeakMap();
const fieldProperties = ['value', 'checked'];
const formMembers = ['form', 'validity', 'validationMessage', 'willValidate', 'checkValidity', 'reportValidity'];
const validityFlags = [
  'valueMissing', 'typeMismatch', 'patternMismatch', 'tooLong', 'tooShort',
  'rangeUnderflow', 'rangeOverflow', 'stepMismatch', 'badInput', 'customError',
];

function define({ name, template, script, styleSheets, observer }) {
  const { bindings, field } = collect([...template.content.children]);
  const isFormControl = Boolean(field);
  const bound = [...new Set(bindings.map(binding => binding.name))];

  bound.forEach(property => {
    if (property in HTMLElement.prototype || property === 'refs' || (isFormControl && formMembers.includes(property))) {
      throw new Error(`<${ name }> can't bind "${ property }": every element already has a ${ property } property, use another name`);
    }
  });

  const properties = [...new Set([...bound, ...(isFormControl ? fieldProperties : [])])];

  class Component extends HTMLElement {
    static observedAttributes = properties.map(toAttribute);
    static formAssociated = isFormControl;

    constructor() {
      super();

      const shadow = this.attachShadow({ mode: 'open', delegatesFocus: isFormControl });
      shadow.adoptedStyleSheets = styleSheets;
      shadow.append(document.importNode(template.content, true));
      observer.observe(shadow, { childList: true, subtree: true });

      const found = collect([...shadow.children]);
      const state = { values: new Map(), bindings: found.bindings, field: found.field, started: false };
      states.set(this, state);
      this.refs = found.refs;
      found.bindings
        .filter(({ kind }) => kind === 'each')
        .forEach(binding => apply(binding, []));

      if (isFormControl) {
        state.internals = this.attachInternals();
        state.field.addEventListener('input', () => sync(this));
        state.field.addEventListener('change', () => {
          sync(this);
          this.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }

      // A property set before the component was defined is an own property of
      // the element that hides the accessor, so it is moved to the accessor
      properties.forEach(property => {
        if (Object.hasOwn(this, property)) {
          const value = this[property];
          delete this[property];
          this[property] = value;
        }
      });
    }

    connectedCallback() {
      const state = states.get(this);
      if (state.started) {
        return;
      }
      state.started = true;
      if (isFormControl) {
        state.initial = { value: state.field.value, checked: state.field.checked };
        sync(this);
      }
      if (typeof script === 'function') {
        script(this);
      }
    }

    attributeChangedCallback(attribute, oldValue, newValue) {
      if (oldValue !== newValue) {
        this[toProperty(attribute)] = newValue;
      }
    }

    formResetCallback() {
      const { field, initial } = states.get(this);
      if (initial) {
        field.value = initial.value;
        field.checked = initial.checked;
        sync(this);
      }
    }

    formDisabledCallback(disabled) {
      states.get(this).field.disabled = disabled;
      sync(this);
    }
  }

  properties.forEach(property => {
    Object.defineProperty(Component.prototype, property, {
      configurable: true,
      get() {
        const { values, field } = states.get(this);
        return isFormControl && fieldProperties.includes(property) ? field[property] : values.get(property);
      },
      set(value) {
        write(this, property, value);
      },
    });
  });

  if (isFormControl) {
    const internals = element => states.get(element).internals;
    Object.defineProperties(Component.prototype, {
      form: { get() { return internals(this).form; } },
      validity: { get() { return internals(this).validity; } },
      validationMessage: { get() { return internals(this).validationMessage; } },
      willValidate: { get() { return internals(this).willValidate; } },
      checkValidity: { value() { return internals(this).checkValidity(); } },
      reportValidity: { value() { return internals(this).reportValidity(); } },
    });
  }

  customElements.define(name, Component);
}

function write(element, property, value) {
  const state = states.get(element);
  state.values.set(property, value);
  const own = state.bindings.filter(binding => binding.name === property);

  own.forEach(binding => {
    if (binding.kind === 'each' && binding.element.localName === 'select') {
      renderOptions(binding);
    } else {
      apply(binding, value);
    }
  });

  if (state.field) {
    if (fieldProperties.includes(property) && !own.length) {
      state.field[property] = property === 'value' ? value ?? '' : value !== false && value !== null && value !== undefined;
    }
    sync(element);
  }

  // Rendering options resets the selected one: keep what the user picked when
  // it is still there, or else select the value that was set for it
  function renderOptions(binding) {
    const select = binding.element;
    const previous = select.value;
    apply(binding, value);
    if ([...select.options].some(option => option.value === previous) && previous !== '') {
      select.value = previous;
    } else {
      state.bindings
        .filter(other => other.element === select && other.kind === 'attribute')
        .forEach(other => apply(other, state.values.get(other.name)));
    }
  }
}

function sync(element) {
  const { field, internals } = states.get(element);
  if (field.type === 'checkbox' || field.type === 'radio') {
    internals.setFormValue(field.checked ? field.value : null);
  } else if (field.localName === 'select' && field.multiple) {
    const data = new FormData();
    [...field.selectedOptions].forEach(option => data.append(element.getAttribute('name') ?? '', option.value));
    internals.setFormValue(data);
  } else {
    internals.setFormValue(field.value);
  }

  if (field.validity.valid) {
    internals.setValidity({});
  } else {
    const flags = Object.fromEntries(validityFlags.map(flag => [flag, field.validity[flag]]));
    internals.setValidity(flags, field.validationMessage, field);
  }
}
