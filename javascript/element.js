export default selector => {
  if (typeof selector === 'string') {
    const instance = document.querySelector(selector);
    if (!instance) {
      throw new Error(`No elements found for selector ${ selector }`);
    }
    return instance;
  }

  return selector;
};