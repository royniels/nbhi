import attributeMapping from './attributeMapping.js';
import { get } from './options.js';
import { register } from './webComponent.js';

export { registerExternal, registerInternal };

let cache = new Set();

function registerExternal(root) {
  const promises = [...root.querySelectorAll(':not(:defined)')]
    .filter(isWebComponent)
    .map(async element => {
      const name = element.tagName.toLowerCase();
      if (!cache.has(name)) {
        cache.add(name);
        const { aliases } = get();
        const aliasId = name.split('-').slice(1).join('-');
        const alias = aliases[aliasId] ? aliases[aliasId] : name;
        const html = await fetchFromFile(alias);
        const templates = [...html.children].filter(child => child instanceof HTMLTemplateElement);
        if (templates.length > 1) {
          throw new Error(`Found multiple <template> tags in ${ name }, please define only one`);
        }
        const template = getTemplate();
        const script = await copyScript(template);
        await registerExternal(template.content);
        registerInternal(template.content, name);
        register(name, template, getUsedAttributes(template), script);

        function getTemplate() {
          if (templates.length) {
            return templates.at(0);
          }
          const template = document.createElement('template');
          template.content.append(...html.children);
          return template;
        }
      };

      async function fetchFromFile(alias) {
        const { structure, directory } = get();
        const relativePath = getPath();
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

        function getPath() {
          const [, ...rest] = alias.split('-');
          if (structure === 'flat') {
            const fileName = rest.join('-');
            return `${ directory }/${ fileName }.html`;
          } else {
            const path = `${ directory }/${ rest.slice(0, -1).join('/') }`;
            const fileName = rest.slice(-1);
            return `${ path }/${ fileName }.html`;
          }
        }
      }
    });

  return Promise.all(promises);

  function isWebComponent(element) {
    if (element?.tagName) {
      const { prefix } = get();
      const tagName = element.tagName.toLowerCase();
      return element.nodeType === 1 && tagName.includes('-') && tagName.startsWith(prefix);
    }
  }
}

function registerInternal(root, parentId) {
  root.querySelectorAll('template').forEach(template => {
    if (!template.id && parentId) {
      template.id = `${ parentId }-child`;
    }

    if (!template.id) {
      console.log(template, parentId);
      throw new Error('<template> is missing a mandatory id field');
    }

    registerInternal(template.content, template.id);
    register(template.id, template, getUsedAttributes(template));
  });
}

function getUsedAttributes(template) {
  const { keyValue, blackList, boolean: binary} = attributeMapping();
  const userDefinedAttributes = findDefinedAttributes(template);
  // console.log(template, userDefinedAttributes);

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
          if (!blackList.includes(attribute.name)) {
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