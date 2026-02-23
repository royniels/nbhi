import { initialize as initializeOptions } from './options.js';
import { registerExternal, registerInternal } from './template.js';

export default async settings => {
  initializeOptions(settings);
  registerInternal(document.querySelector('body'));
  await registerExternal(document.querySelector('body'));
};
