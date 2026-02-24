import { getDefinition } from './customElement.js';
/*
update(selector)('some text') -> update default slot
update(selector)({ key: 'text' }) -> update named slot
update(selector)({ $attr: true }) -> update a boolean attribute
update(selector)({ $attr: 'text' }) -> update a keyValue attribute
update(parentId, componentName)(['text a', 'text b']) -> create children and update the default slot
update(parentId, componentName)([{ key: 'text a' }, { key: 'text b' }]) -> create children and update a name slot
update(parentId, componentName)([{ $attr: 'text a' }, { $attr: 'text b' }]) -> create children and update an attribute
*/
export default (selector, componentName) => {
  const instance = document.querySelector(selector);
  const recordIdentity = new WeakMap();
  let childKeyMap = new Map();
  let nextIdentity = 1;

  if (!instance) {
    throw new Error(`Cannot update, ${ selector } could not be found`);
  }

  return data => {
    if (isArray(data)) {
      if (!componentName) {
        throw new Error('Please provide a component name, ie: my-component');
      }
      updateList(data);
    } else {
      if (isPrimitive(data)) {
        updateText(instance, data);
      } else if (isObject(data)) {
        updateFromObject(instance, data);
      }
    }

    function isPrimitive(input) {
      return !isArray(input) && !isObject(input);
    }

    function isObject(input) {
      return !isArray(input) && input !== null && typeof input === 'object';
    }

    function isArray(input) {
      return Array.isArray(input);
    }

    function updateFromObject(element, data) {
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('$')) {
          updateAttribute(element, key, value);
        } else {
          updateText(element, value, key);
        }
      });
    }

    function updateText(element, value, name) {
      // When data is an array and the custom element is extending slots cannot
      // be used, so we use the name attribute instead to find the component and
      // update the text
      if (isArray(data) && getDefinition(componentName).extend) {
        const instance = element.querySelector(`[name="${ name }"]`);
        if (instance) {
          instance.textContent = value;
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

    function updateAttribute(value, name) {
      // Implement
    }

    function updateList(records) {
      const newChildren = [];
      const newKeyMap = new Map();

      records.forEach((record, index) => {
        const identity = getIdentity(record, index);
        let child = childKeyMap.get(identity);

        if (!child) {
          const { extend } = getDefinition(componentName);
          if (extend) {
            child = document.createElement(extend, { is: componentName });
          } else {
            child = document.createElement(componentName);
          }
          instance.append(child);
        }

        if (child.cachedRecordData !== record) {
          if (isObject(record)) {
            updateFromObject(child, record);
          } else {
            updateText(child, record);
          }
          child.cachedRecordData = record;
        }

        newChildren.push(child);
        newKeyMap.set(identity, child);

        function getIdentity(record, index) {
          if (record && typeof record === 'object') {
            if (!recordIdentity.has(record)) {
              recordIdentity.set(record, nextIdentity++);
            }
            return recordIdentity.get(record);
          }
          return `p:${ record }:${ index }`;
        };
      });

      // remove stale children
      for (const [identity, child] of childKeyMap.entries()) {
        if (!newKeyMap.has(identity)) {
          child.remove();
        }
      }

      // reorder DOM to match new order
      newChildren.forEach((child, index) => {
        const current = instance.children[index];
        if (current !== child) {
          instance.insertBefore(child, current || null);
        }
      });

      childKeyMap = newKeyMap;
    }
  };
};