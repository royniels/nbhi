const start = performance.now();

import { initialize, update } from '/javascript/index.js';
await initialize();

update('eg-defaultjs')('Overwritten title');
update('eg-namedjs')({ title: 'Overwritten title', description: 'Overwritten description' });

update('tbody', 'eg-tr')([
  { title: 'Title A', description: 'Description A', '$data-id': 'record-a' },
  { title: 'Title B', description: 'Description B', '$data-id': 'record-b' }
]);

const end = performance.now();
console.log(`Registered all components in ${ Math.round(end - start) } ms`);
