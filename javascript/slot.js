import getElement from './element.js';

export default (data, selector) => {
  const element = getElement(selector);
  if (!(typeof data === 'string' || (!Array.isArray(data) && data !== null && typeof data === 'object'))) {
    throw new Error('data needs to be a string or an object where each key is a slot name');
  }

  if (typeof data === 'string') {
    update(data);
  } else {
    Object.entries(data).forEach(([slotName, value]) => update(value, slotName));
  }

  function update(value, slotName) {
    if (!slotName) {
      element.textContent = value;
    } else {
      let slot = element.querySelector(`[slot="${ slotName }"]`);
      if (!slot) {
        slot = document.createElement('span');
        slot.setAttribute('slot', slotName);
        element.append(slot);
      }
      slot.textContent = value;
    }
  }
};