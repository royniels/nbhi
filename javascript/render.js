export { collect, apply, rows, toAttribute, toProperty };

const fieldTags = ['input', 'select', 'textarea'];
const fieldProperties = ['value', 'checked', 'selected'];
const lists = new WeakMap();
const rowBindings = new WeakMap();

// Reads the bindings, refs and form field of the given elements and everything
// inside them, except the rows of an nb-each element: those bind to records
function collect(elements) {
  const bindings = [];
  const refs = {};
  let field = null;
  elements.forEach(visit);
  return { bindings, refs, field: refs.field ?? field };

  function visit(element) {
    [...element.attributes].forEach(({ name, value }) => {
      if (name === 'nb-text') {
        bindings.push({ element, kind: 'text', name: value });
      } else if (name === 'nb-html') {
        bindings.push({ element, kind: 'html', name: value });
      } else if (name === 'nb-each') {
        bindings.push({ element, kind: 'each', name: value });
      } else if (name === 'nb-ref') {
        refs[value] = element;
      } else if (name.startsWith(':')) {
        bindings.push({ element, kind: 'attribute', attribute: name.slice(1), name: value });
      }
    });

    if (!field && fieldTags.includes(element.localName)) {
      field = element;
    }

    if (!element.hasAttribute('nb-each')) {
      [...element.children].forEach(visit);
    }
  }
}

function apply({ element, kind, attribute }, value) {
  if (kind === 'text') {
    element.textContent = value ?? '';
  } else if (kind === 'html') {
    element.innerHTML = value ?? '';
  } else if (kind === 'each') {
    rows(element, value ?? []);
  } else {
    setAttribute(element, attribute, value);
  }
}

function setAttribute(element, attribute, value) {
  const isComponent = element.localName.includes('-');
  const isOwnAttribute = attribute.startsWith('data-') || attribute.startsWith('aria-');
  const isOn = value !== false && value !== null && value !== undefined;

  if (isComponent && !isOwnAttribute) {
    element[toProperty(attribute)] = value;
  } else if (fieldProperties.includes(attribute) && [...fieldTags, 'option'].includes(element.localName)) {
    element[attribute] = attribute === 'value' ? value ?? '' : isOn;
  } else if (isOn) {
    element.setAttribute(attribute, value === true ? '' : value);
  } else {
    element.removeAttribute(attribute);
  }
}

function rows(element, records, each) {
  const list = lists.get(element) ?? createList();
  const rendered = new Map();

  records.forEach((input, index) => {
    const record = input !== null && typeof input === 'object' ? input : { id: input, value: input };
    const key = getKey(record, index);
    const row = list.rows.get(key) ?? createRow();
    rowBindings.get(row).forEach(binding => apply(binding, record[binding.name]));
    if (each) {
      each(row, input);
    }
    rendered.set(key, row);
  });

  list.rows.forEach((row, key) => {
    if (!rendered.has(key)) {
      row.remove();
    }
  });

  let reference = list.container.firstElementChild;
  rendered.forEach(row => {
    if (row === reference) {
      reference = row.nextElementSibling;
    } else if (list.container.moveBefore && list.container.isConnected && row.parentNode === list.container) {
      // moveBefore keeps focus and the state of the row, insertBefore would
      // disconnect and reconnect it. Not every browser has it yet
      list.container.moveBefore(row, reference);
    } else {
      list.container.insertBefore(row, reference);
    }
  });

  list.rows = rendered;

  function getKey(record, index) {
    const key = `id:${ record.id }`;
    if (['string', 'number'].includes(typeof record.id) && !rendered.has(key)) {
      return key;
    }
    return `position:${ index }`;
  }

  function createRow() {
    const row = list.template.cloneNode(true);
    rowBindings.set(row, collect([row]).bindings);
    return row;
  }

  function createList() {
    const container = element.localName === 'table'
      ? element.tBodies[0] ?? element.createTBody()
      : element;
    const template = container.firstElementChild;
    if (!template) {
      throw new Error(`rows() needs a first element in <${ element.localName }> to use as the row template`);
    }
    template.remove();
    const created = { container, template, rows: new Map() };
    lists.set(element, created);
    return created;
  }
}

function toAttribute(property) {
  return property.replace(/[A-Z]/g, letter => `-${ letter.toLowerCase() }`);
}

function toProperty(attribute) {
  return attribute.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}
