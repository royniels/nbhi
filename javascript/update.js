import element from './element.js';

export default (selector, componentName, extend) => {
  const instance = element(selector);
  const recordIdentity = new WeakMap();
  let childKeyMap = new Map();
  let nextIdentity = 1;

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
          const name = key.slice(1);
          if (value === false) {
            element.removeAttribute(name);
          } else if (value === true) {
            element.setAttribute(name, '');
          } else {
            element.setAttribute(name, value);
          }
        } else {
          updateText(element, value, key);
        }
      });
    }

    function updateText(element, value, name) {
      // When data is an array and the custom element is extending slots cannot
      // be used, so we use the name attribute instead to find the component and
      // update the text
      if (isArray(data) && extend) {
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

    function updateList(records) {
      const newChildren = [];
      const newKeyMap = new Map();

      records.forEach((record, index) => {
        const identity = getIdentity(record, index);
        let child = childKeyMap.get(identity);

        if (!child) {
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