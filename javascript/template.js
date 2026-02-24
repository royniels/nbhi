import { register } from './customElement.js';

export default ({ prefix = 'db', source = '/components', attributes = {} }) => {

  if (typeof source !== 'string' || !Object.keys(source).length) {
    throw new Error('source option needs to be a string or an object');
  }

  if (typeof prefix !== 'string' || prefix === '') {
    throw new Error('prefix option needs to be a string of at least one character');
  }

  const cache = new Set();
  const attributeMapping = getAttributeMapping();

  return { fromFile, inPage };

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
      register({ name, template, attributeMapping, usedAttributes });
    });
  }

  function fromFile(root) {
    const promises = [...root.querySelectorAll(':not(:defined)')]
      .filter(element => {
        const tagName = element.tagName.toLowerCase();
        return element.nodeType === 1 && tagName.includes('-') && tagName.startsWith(prefix);
      })
      .map(async element => {
        const name = element.tagName.toLowerCase();
        if (!cache.has(name)) {
          cache.add(name);
          const html = await fetchFromFile(name);
          const templates = [...html.children].filter(child => child instanceof HTMLTemplateElement);
          if (templates.length > 1) {
            throw new Error(`Found multiple <template> tags in ${ name }, please define only one`);
          }
          const template = getTemplate();
          const script = await copyScript(template);
          await fromFile(root);
          inPage(template.content, name);
          const usedAttributes = getUsedAttributes(template);
          register({ name, template, usedAttributes, attributeMapping, script });

          function getTemplate() {
            if (templates.length) {
              return templates.at(0);
            }
            const template = document.createElement('template');
            template.content.append(...html.children);
            return template;
          }

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
          const head = document.querySelector('head');
          const body = document.querySelector('body');
          if (head && head.children.length) {
            return head;
          } else if (body) {
            return body;
          }

          throw new Error(`Could not find any content in ${ relativePath }`);
        }
      });

    return Promise.all(promises);
  }

  function getUsedAttributes(template) {
    const { keyValue, excluded, boolean: binary } = attributeMapping;
    const userDefinedAttributes = findDefinedAttributes(template);

    return [
      ...Object.entries(userDefinedAttributes),
      ...getElementsFromMapping(binary),
      ...getElementsFromMapping(keyValue),
    ]
      .reduce((output, [key, value]) => {
        output[key] = output[key] ? [...new Set([...output[key], ...value])] : value;
        return output;
      }, {});

    function getElementsFromMapping(input) {
      const userDefinedElements = [...new Set(Object.values(userDefinedAttributes).flat())];
      return Object
        .entries(input)
        .filter(([, elements]) => elements.find(element => userDefinedElements.includes(element)));
    }

    function findDefinedAttributes(template) {
      const results = {};
      addAttributesFromElement(template);

      function traverse(element) {
        if (element && typeof element.tagName === 'string') {
          const tagName = element.tagName.toLowerCase();
          if (!['slot', 'template', 'style'].includes(tagName)) {
            addAttributesFromElement(element);
          }
        }
        [...element.children].forEach(child => traverse(child));
      }

      traverse(template.content);
      return results;

      function addAttributesFromElement(element) {
        if (element.attributes) {
          [...element.attributes].forEach(attribute => {
            if (!excluded.includes(attribute.name)) {
              const tag = element.tagName.toLowerCase();
              if (tag !== 'slot') {
                const key = attribute.name;
                if (!results[key]) {
                  results[key] = [tag];
                }
                results[key].push();
              }
            }
          });
        }
      }
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
      // Attributes that should not be tracked
      excluded: ['class', 'extends', 'id', 'part']
    };

    Object.entries(attributes).forEach(([key, { excluded = false, type, elements = [] }]) => {
      if (excluded === true) {
        mapping.excluded = [...new Set([...mapping.excluded, key])];
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