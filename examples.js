const start = performance.now();

import beta from '/javascript/index.js';
// If you have external templates you need to wait for the init
await beta({ prefix: 'eg' });

qs('eg-defaultjs').setSlot('Overwritten title');

qs('eg-namedjs').setSlot('Overwritten title', 'title');
qs('eg-namedjs').setSlot('Overwritten description', 'description');

qs('eg-nested').setSlot('Overwritten', 'title', 'em');
qs('eg-nested').setSlot('Overwritten', 'description', 'strong');

qs('eg-attrjs').disabled = true;
qs('eg-attrjs').setAttribute('value', 'Field value');

qs('eg-list').setChildren([
  { title: 'Title A', description: 'Description A', '$data-id': 'record-a' },
  { title: 'Title B', description: 'Description B', '$data-id': 'record-b' }
]);


const end = performance.now();
console.log(`Registered all components in ${ Math.round(end - start) } ms`);

function qs(name) {
  return document.querySelector(name);
}