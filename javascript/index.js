import register from './template.js';
import slot from './slot.js';

export { initialize, slot };

async function initialize(options = {}) {
  const { inPage, fromFile } = register(options);
  inPage(document.querySelector('body'));
  await fromFile(document.querySelector('body'));
}