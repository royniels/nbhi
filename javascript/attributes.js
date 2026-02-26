export { getAttributeMapping, updateAttributes };

function getAttributeMapping(element, extending = {}) {
  const { keyValue, excludedAttributes, excludedElements, boolean: binary } = extendAttributeMapping();
  const results = {};
  traverse(element);
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
        .filter(([, tagNames]) => tagNames.includes(tagName))
        .forEach(([key, tagNames]) => results[key] = { type: 'boolean', tagNames });

      Object
        .entries(keyValue)
        .filter(([key]) => !excludedAttributes.includes(key))
        .filter(([, tagNames]) => tagNames.includes(tagName))
        .forEach(([key, tagNames]) => results[key] = { type: 'keyValue', tagNames });

      if (element.hasAttributes()) {
        [...element.attributes].forEach(attribute => {
          const name = attribute.name;
          if (!excludedAttributes.includes(name)) {
            if (!results[name]) {
              results[name] = { type: 'userDefined', tagNames: [] };
            }

            if (!results[name].tagNames.includes(tagName)) {
              results[name].tagNames.push(tagName);
            }
          }
        });
      }
    }
    [...element.children].forEach(child => traverse(child));
  }

  function extendAttributeMapping() {
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
        target: ['a'],
        src: ['audio', 'img', 'input', 'video'],
      },
      excludedAttributes: ['class', 'extends', 'id', 'part', 'data-slot', 'child'],
      excludedElements: ['slot', 'template', 'style', 'script'],
    };

    Object.entries(extending).forEach(([key, { excluded = false, type, elements = [] }]) => {
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
};

function updateAttributes({ name, value, attributeMapping, root }) {
  const { type, tagNames = [] } = attributeMapping[name] ?? [];

  if (type === 'userDefined') {
    process(root.querySelector(`[${ name }]`));
  } else {
    tagNames.forEach(tagName => {
      root.querySelectorAll(tagName).forEach(process);
      if (tagName === root?.localName) {
        process(root);
      }
    });
  }

  function process(element) {
    if (element) {
      if (
        value === null ||
        value === undefined ||
        (type === 'boolean' && value === false)
      ) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, value);
        // Triggers <select> to update the selected <option>
        if (name === 'value') {
          element.value = value;
        }
      }
    }
  }
}