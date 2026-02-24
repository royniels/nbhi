import register from './template.js';
import update from './update.js';

export { initialize, update };

async function initialize(options = {}) {
  const { inPage, fromFile } = register(options);
  inPage(document.querySelector('body'));
  await fromFile(document.querySelector('body'));
}