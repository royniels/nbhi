const start = performance.now();

import { initialize, slot } from '/javascript/index.js';
await initialize();

slot('Overwritten title', 'eg-defaultjs');
slot({ title: 'Overwritten title', description: 'Overwritten description' }, 'eg-namedjs');

$('eg-attrjs').disabled = true;
$('eg-attrjs').setAttribute('value', 'Field value');

// $('.list').setChildren([
//   { title: 'Title A', description: 'Description A', '$data-id': 'record-a' },
//   { title: 'Title B', description: 'Description B', '$data-id': 'record-b' }
// ]);

const end = performance.now();
console.log(`Registered all components in ${ Math.round(end - start) } ms`);

function $(selector) {
  return document.querySelector(selector);
}
