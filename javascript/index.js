import { define } from './component.js';
import { rows } from './render.js';

export { initialize, rows };

async function initialize({ prefix = 'nb', source = '/components' } = {}) {
  const registerCache = new Set();
  const fileCache = new Map();

  if (typeof prefix !== 'string' || prefix === '') {
    throw new Error('prefix option needs to be a string of at least one character');
  }

  const styleSheets = [...getInheritedStylesheets(), getHiddenStylesheet()];
  const body = document.querySelector('body');
  const observer = new MutationObserver(loadAdded);
  inPage(body);
  observer.observe(body, { childList: true, subtree: true });
  await fromFile(body);

  function inPage(root) {
    root.querySelectorAll('template').forEach(template => {
      if (template.id.startsWith(`${ prefix }-`)) {
        inPage(template.content);
        register({ name: template.id, template });
      }
    });
  }

  function loadAdded(mutations) {
    mutations
      .flatMap(mutation => [...mutation.addedNodes])
      .filter(node => node.nodeType === Node.ELEMENT_NODE)
      .forEach(node => {
        fromElements([node, ...node.querySelectorAll('*')]).catch(error => console.error(error));
      });
  }

  function fromFile(root, ancestors = []) {
    return fromElements([...root.querySelectorAll('*')], ancestors);
  }

  function fromElements(elements, ancestors = []) {
    const names = elements
      .filter(element => element.localName.startsWith(`${ prefix }-`) && element.matches(':not(:defined)'))
      .map(element => element.localName)
      .filter(name => !ancestors.includes(name));

    // A component that another branch is still loading is awaited rather than
    // skipped, so a parent is never defined before the components inside it
    const promises = [...new Set(names)].map(name => {
      if (!fileCache.has(name)) {
        fileCache.set(name, load(name));
      }
      return fileCache.get(name);
    });

    return Promise.all(promises);

    async function load(name) {
      const html = await fetchFromFile(name);
      const template = document.createElement('template');
      template.content.append(...html.children);
      const script = await importScript(template);
      await fromFile(template.content, [...ancestors, name]);
      inPage(template.content);
      register({ name, template, script });

      async function importScript(template) {
        const script = template.content.querySelector('script');
        if (!script) {
          return null;
        }
        script.remove();
        const blob = new Blob([script.textContent], { type: 'text/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        try {
          return (await import(blobUrl)).default;
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      }

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
    }
  }

  function register({ name, template, script = null }) {
    if (registerCache.has(name)) {
      return;
    }
    registerCache.add(name);
    define({ name, template, script, styleSheets, observer });
  }

  function getInheritedStylesheets() {
    return Array.from(document.styleSheets)
      .filter(sheet => sheet?.ownerNode?.dataset?.inherit === 'true')
      .map(sheet => {
        const newSheet = new CSSStyleSheet();
        try {
          const cssText = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
          newSheet.replaceSync(cssText);
        } catch (error) {
          console.error('Permission denied for sheet:', sheet.href, error);
        }
        return newSheet;
      });
  }

  // The browser hides [hidden] with a user agent style, which any display in
  // the component's own CSS overrides
  function getHiddenStylesheet() {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(':host([hidden]) { display: none !important; }');
    return sheet;
  }
}
