const cache = {};

export default selector => {
  if (!cache[selector]) {
    const instance = document.querySelector(selector);
    if (!instance) {
      throw new Error(`Cannot find element ${ selector }`);
    } else if (!instance.tagName.includes('-')) {
      throw new Error(`Element ${ selector } is not a custom element`);
    }
    cache[selector] = instance;
  }
  return cache[selector];
};