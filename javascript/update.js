import { getAttributeMapping, updateAttributes } from './attributes.js';
import element from './element.js';

export default selector => {
  const instance = element(selector);
  const idCache = new WeakMap();
  const mappingCache = new WeakMap();
  let renderedChildren = new Map();
  let idCount = 1;
  let templateChild;

  return data => {
    if (isDate(data)) {
      throw new Error('Please convert date to string, ie. toISOString()');
    }

    if (isArray(data)) {
      updateList(data);
    } else {
      if (isPrimitive(data)) {
        updateText(instance, data);
      } else if (isObject(data)) {
        updateFromObject(instance, data);
      }
    }

    function isDate(input) {
      return input?.getTime !== undefined;
    }

    function isPrimitive(input) {
      return !isArray(input) && !isObject(input);
    }

    function isObject(input) {
      return !isArray(input) && input !== null && typeof input === 'object' && Object.keys(input).length;
    }

    function isArray(input) {
      return Array.isArray(input);
    }

    function updateFromObject(element, data) {
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('$')) {
          const name = key.slice(1);
          if (element.shadowRoot) {
            if (value === false) {
              element.removeAttribute(name);
            } else if (value === true) {
              element.setAttribute(name, '');
            } else {
              element.setAttribute(name, value);
            }
          } else {
            if (!mappingCache.has(element)) {
              mappingCache.set(element, getAttributeMapping(element));
            }
            const attributeMapping = mappingCache.get(element);
            updateAttributes({ name, value, attributeMapping, root: element });
          }
        } else {
          updateText(element, value, key);
        }
      });
    }

    function updateText(element, value, name) {
      if (element.localName === 'option') {
        element.textContent = value;
      } else if (
        element.localName === 'tr' ||
        element.localName === 'li' ||
        (element.hasAttribute('child') && !element.shadowRoot)) {
        if (element.hasAttribute('data-slot') && element.dataset.slot === name) {
          element.textContent = value;
        } else {
          const match = element.querySelector(`[data-slot="${ name }"]`);
          if (match) {
            match.textContent = value;
          }
        }
      } else if (!name && element.textContent !== value) {
        element.textContent = value;
      } else {
        let slot = element.querySelector(`[slot="${ name }"]`);
        if (!slot) {
          slot = document.createElement('span');
          slot.setAttribute('slot', name);
          element.append(slot);
        }

        if (slot.textContent !== value) {
          slot.textContent = value;
        }
      }
    }

    function updateList(records) {
      const parent = getParent();

      if (!templateChild) {
        throw new Error(`Cannot update ${ selector }, cannot find child element`);
      }

      const newChildren = new Map();

      records.forEach((record, index) => {
        const id = getId(record, index);
        let child = renderedChildren.get(id);

        if (!child) {
          child = templateChild.cloneNode(true);
          parent.append(child);
        }

        if (child.cachedData !== record) {
          if (isObject(record)) {
            updateFromObject(child, record);
          } else {
            updateText(child, record);
          }
          child.cachedData = record;
        }

        newChildren.set(id, child);
      });

      renderedChildren.forEach((child, id) => {
        if (!newChildren.has(id)) {
          child.remove();
        }
      });

      // Order children
      let lastChild;
      newChildren.forEach(child => {
        if (child !== lastChild?.nextSibling) {
          parent.insertBefore(child, lastChild ? lastChild.nextSibling : parent.firstChild);
        }
        lastChild = child;
      });

      renderedChildren = newChildren;

      function getId(record, index) {
        if (record && typeof record === 'object') {
          if (!idCache.has(record)) {
            idCache.set(record, idCount++);
          }
          return idCache.get(record);
        }
        return `p:${ record }:${ index }`;
      };

      function getParent() {
        const topLevel = getTopLevel();
        if (topLevel.localName === 'table') {
          return process('tbody', 'tr');
        } else if (topLevel.localName === 'ol') {
          return process('ol', 'li');
        } else if (topLevel.localName === 'ul') {
          return process('ul', 'li');
        } else if (topLevel.localName === 'select') {
          return process('select', 'option');
        } else if (topLevel.querySelector('[child]')) {
          const parent = getParent(topLevel.querySelector('[child]')).parentElement;
          setTemplateChild('[child]', parent);
          if (parent.localName === 'slot' && parent.hasAttribute('name')) {
            templateChild.slot = parent.getAttribute('name');
          }
          return parent.localName === 'slot' ? instance : parent;
        }

        throw new Error(`Could not find a parent to assign children to, valid
          options are table, ul, ol, select or a structure with a child attribute`);

        function process(parentName, childName) {
          const parent = getParent(parentName);
          setTemplateChild(childName, parent);
          return parent;
        }

        function setTemplateChild(childName, parent) {
          if (!templateChild) {
            templateChild = parent.querySelector(childName).cloneNode(true);
            parent.replaceChildren();
          }
        }

        function getParent(parentName) {
          const parent = typeof parentName === 'string'
            ? topLevel.querySelector(parentName) : parentName;
          if (!parent) {
            throw new Error('Cannot update table, missing tbody');
          }
          return parent;
        }

        function getTopLevel() {
          if (instance.tagName.includes('-')) {
            return [...instance.shadowRoot.children].find(child => {
              return child.localName !== 'script' && child.localName !== 'style';
            });
          }
          return instance;
        }
      }
    }
  };
};