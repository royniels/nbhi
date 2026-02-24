import register from './template.js';

export default async (options = {}) => {
  const { inPage, fromFile } = register(options);
  inPage(document.querySelector('body'));
  await fromFile(document.querySelector('body'));
};