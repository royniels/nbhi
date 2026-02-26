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
        if (parent.localName === 'tbody') {
          templateChild = parent.querySelector('tr').cloneNode(true);
        } else if (parent.localName === 'ol' || parent.localName === 'ul') {
          templateChild = parent.querySelector('li').cloneNode(true);
        } else if (parent.localName === 'select') {
          templateChild = parent.querySelector('option').cloneNode(true);
        } else if (parent.querySelector(('[child'))) {
          templateChild = parent.querySelector('[child]').cloneNode(true);
        }

        parent.replaceChildren();
      }

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
          const tbody = topLevel.querySelector('tbody');
          if (!tbody) {
            throw new Error('Cannot update table, missing tbody');
          }
          return tbody;
        } else if (topLevel.querySelector('[child]')) {
          const parent = topLevel.querySelector('[child]').parentElement;
          if (!parent) {
            throw new Error(`Cannot update ${ selector }, cannot find a parent node`);
          }
          return parent;
        }
        return topLevel;

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