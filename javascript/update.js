import element from './element.js';

export default selector => {
  const instance = element(selector);
  const recordIdentity = new WeakMap();
  let childKeyMap = new Map();
  let nextIdentity = 1;
  let templateChild;

  return data => {
    if (isArray(data)) {
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
      if (element.localName === 'option') {
        element.textContent = value;
      } else if (element.localName === 'tr' || element.localName === 'li') {
        const match = element.querySelector(`[data-slot="${ name }"]`);
        if (match) {
          match.textContent = value;
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
        // } else {
        //   templateChild = instance.querySelector('.child').cloneNode(true);
        }

        parent.replaceChildren();
      }

      if (!templateChild) {
        throw new Error(`Cannot update ${ selector }, cannot find child element`);
      }

      const newChildren = [];
      const newKeyMap = new Map();

      records.forEach((record, index) => {
        const identity = getIdentity(record, index);
        let child = childKeyMap.get(identity);

        if (!child) {
          child = templateChild.cloneNode(true);
          parent.append(child);
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
        const current = parent.children[index];
        if (current !== child) {
          parent.insertBefore(child, current || null);
        }
      });

      childKeyMap = newKeyMap;

      function getParent() {
        if (instance.tagName.includes('-')) {
          const topLevel = [...instance.shadowRoot.children].find(child => {
            return child.localName !== 'script' && child.localName !== 'style';
          });
          if (topLevel.localName === 'table') {
            const tbody = topLevel.querySelector('tbody');
            if (!tbody) {
              throw new Error('Cannot update table, missing tbody');
            }
            return tbody;
          }
          return topLevel;
        }

        return instance.localName;
      }
    }
  };
};