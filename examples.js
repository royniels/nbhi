const start = performance.now();

import { initialize, update, onceVisible } from '/javascript/index.js';
await initialize();

update('eg-defaultjs')('Overwritten title');
update('eg-namedjs')({ title: 'Overwritten title', description: 'Overwritten description' });
update('eg-attrjs')({ $disabled: true, $value: 'Field value' });

onceVisible('tbody', () => {
  update('tbody', 'eg-tr')([
    { title: 'Title A', description: 'Description A' },
    { title: 'Title B', description: 'Description B' }
  ]);
});

const end = performance.now();
console.log(`Registered all components in ${ Math.round(end - start) } ms`);
