import { test, expect } from '@playwright/test';
import { open } from './support/open.js';

async function openComponent(page, template, instance = '<nb-subject></nb-subject>') {
  await open(page, { body: `<template id="nb-subject">${ template }</template>${ instance }` });
  await page.evaluate(() => nbhi.initialize());
}

function set(page, values) {
  return page.evaluate(values => Object.assign(document.querySelector('nb-subject'), values), values);
}

test.describe('bindings', () => {
  test('nb-text sets the text of the element', async ({ page }) => {
    await openComponent(page, '<h2 nb-text="heading">Default</h2>');
    await expect(page.locator('nb-subject h2')).toHaveText('Default');

    await set(page, { heading: 'Getting started' });
    await expect(page.locator('nb-subject h2')).toHaveText('Getting started');
  });

  test('nb-text shows markup as text and never runs it', async ({ page }) => {
    await openComponent(page, '<p nb-text="description"></p>');
    await set(page, { description: '<img src="/missing.png" onerror="window.injected = true">' });

    await expect(page.locator('nb-subject p')).toHaveText('<img src="/missing.png" onerror="window.injected = true">');
    expect(await page.evaluate(() => window.injected)).toBeUndefined();
  });

  test('nb-html sets the HTML of the element', async ({ page }) => {
    await openComponent(page, '<div nb-html="description"></div>');
    await set(page, { description: 'Read <strong>this</strong>' });

    await expect(page.locator('nb-subject strong')).toHaveText('this');
  });

  test(':attribute sets the attribute', async ({ page }) => {
    await openComponent(page, '<a :href="link">Open</a><img :src="photo" :alt="name">');
    await set(page, { link: '/authors/jane-doe', photo: '/images/jane-doe.jpg', name: 'Jane Doe' });

    await expect(page.locator('nb-subject a')).toHaveAttribute('href', '/authors/jane-doe');
    await expect(page.locator('nb-subject img')).toHaveAttribute('src', '/images/jane-doe.jpg');
    await expect(page.locator('nb-subject img')).toHaveAttribute('alt', 'Jane Doe');
  });

  test('one property updates every element that binds it', async ({ page }) => {
    await openComponent(page, '<h2 nb-text="name"></h2><img :alt="name">');
    await set(page, { name: 'Jane Doe' });

    await expect(page.locator('nb-subject h2')).toHaveText('Jane Doe');
    await expect(page.locator('nb-subject img')).toHaveAttribute('alt', 'Jane Doe');
  });

  test('the same attribute on two elements gets two names', async ({ page }) => {
    await openComponent(page, '<input type="date" :value="start" :min="earliest"><input type="date" :value="end" :min="start">');
    await set(page, { start: '2024-01-01', end: '2025-12-31', earliest: '2020-01-01' });

    await expect(page.locator('nb-subject input').first()).toHaveValue('2024-01-01');
    await expect(page.locator('nb-subject input').first()).toHaveAttribute('min', '2020-01-01');
    await expect(page.locator('nb-subject input').last()).toHaveValue('2025-12-31');
    await expect(page.locator('nb-subject input').last()).toHaveAttribute('min', '2024-01-01');
  });
});

test.describe('values', () => {
  test('true sets an attribute without a value, false, null and undefined remove it', async ({ page }) => {
    await openComponent(page, '<button :disabled="locked">Apply</button>');

    await set(page, { locked: true });
    await expect(page.locator('nb-subject button')).toHaveAttribute('disabled', '');
    for (const locked of [false, null, undefined]) {
      await set(page, { locked: true });
      await set(page, { locked });
      await expect(page.locator('nb-subject button')).not.toHaveAttribute('disabled');
    }
  });

  test('null and undefined empty the text', async ({ page }) => {
    await openComponent(page, '<p nb-text="note">Default</p>');

    await set(page, { note: null });
    await expect(page.locator('nb-subject p')).toHaveText('');
    await set(page, { note: 'Note' });
    await set(page, { note: undefined });
    await expect(page.locator('nb-subject p')).toHaveText('');
  });

  test('numbers are shown as text, zero too', async ({ page }) => {
    await openComponent(page, '<p nb-text="count"></p>');
    await set(page, { count: 0 });

    await expect(page.locator('nb-subject p')).toHaveText('0');
  });

  test(':value and :checked on form fields set the property, not the attribute', async ({ page }) => {
    await openComponent(page, '<input :value="amount"><input type="checkbox" :checked="agreed">');
    await page.locator('nb-subject input').first().fill('typed');
    await set(page, { amount: '120', agreed: true });

    await expect(page.locator('nb-subject input').first()).toHaveValue('120');
    await expect(page.locator('nb-subject input').first()).not.toHaveAttribute('value');
    await expect(page.locator('nb-subject input[type="checkbox"]')).toBeChecked();
  });

  test('reading a property gives back the last value that was set', async ({ page }) => {
    await openComponent(page, '<p nb-text="tags"></p>');
    await set(page, { tags: ['html', 'css'] });

    expect(await page.evaluate(() => document.querySelector('nb-subject').tags)).toEqual(['html', 'css']);
  });
});

test.describe('properties as attributes', () => {
  test('an attribute in the HTML sets the property, a camelCase property is a kebab-case attribute', async ({ page }) => {
    await openComponent(page, '<p nb-text="startDate"></p><button :disabled="locked"></button>', '<nb-subject start-date="2024-01-01" locked></nb-subject>');

    await expect(page.locator('nb-subject p')).toHaveText('2024-01-01');
    await expect(page.locator('nb-subject button')).toBeDisabled();
  });

  test('changing the attribute changes the property', async ({ page }) => {
    await openComponent(page, '<p nb-text="start"></p>', '<nb-subject start="2024-01-01"></nb-subject>');
    await page.evaluate(() => document.querySelector('nb-subject').setAttribute('start', '2024-06-01'));

    await expect(page.locator('nb-subject p')).toHaveText('2024-06-01');
    expect(await page.evaluate(() => document.querySelector('nb-subject').start)).toBe('2024-06-01');
  });

  test('removing a boolean attribute turns it off', async ({ page }) => {
    await openComponent(page, '<button :disabled="locked"></button>', '<nb-subject locked></nb-subject>');
    await page.evaluate(() => document.querySelector('nb-subject').removeAttribute('locked'));

    await expect(page.locator('nb-subject button')).toBeEnabled();
  });
});

test('a property set before the component is defined is kept', async ({ page }) => {
  await open(page, {
    body: '<section class="target"></section>',
    components: { card: '<h2 nb-text="heading"></h2>' },
  });
  await page.evaluate(() => {
    const card = document.createElement('nb-card');
    card.heading = 'Getting started';
    document.querySelector('.target').append(card);
    return nbhi.initialize();
  });

  await expect(page.locator('nb-card h2')).toHaveText('Getting started');
  expect(await page.evaluate(() => document.querySelector('nb-card').heading)).toBe('Getting started');
});

test.describe('what is not a property', () => {
  test('global attributes stay on the component', async ({ page }) => {
    await openComponent(page, '<p class="inner">Text</p>', '<nb-subject class="outer" title="Tooltip" data-state="open"></nb-subject>');

    await expect(page.locator('nb-subject p')).toHaveAttribute('class', 'inner');
    await expect(page.locator('nb-subject p')).not.toHaveAttribute('title');
    await expect(page.locator('nb-subject p')).not.toHaveAttribute('data-state');
    expect(await page.evaluate(() => customElements.get('nb-subject').observedAttributes)).toEqual([]);
  });

  test('hidden hides the whole component, also when its CSS sets display', async ({ page }) => {
    await openComponent(page, '<style>:host { display: block; }</style><p>Text</p>', '<nb-subject hidden></nb-subject>');

    await expect(page.locator('nb-subject')).toBeHidden();
  });

  test('hidden on the component leaves hidden elements inside alone', async ({ page }) => {
    await openComponent(page, '<p class="message" hidden>Nothing found</p><p>Content</p>', '<nb-subject hidden></nb-subject>');
    await page.evaluate(() => document.querySelector('nb-subject').removeAttribute('hidden'));

    await expect(page.locator('nb-subject')).toBeVisible();
    await expect(page.locator('nb-subject .message')).toBeHidden();
  });

  test('a styling attribute is selected in the component CSS', async ({ page }) => {
    await openComponent(page, '<style>:host([variant="danger"]) p { color: rgb(220, 20, 60); }</style><p>Text</p>', '<nb-subject variant="danger"></nb-subject>');

    await expect(page.locator('nb-subject p')).toHaveCSS('color', 'rgb(220, 20, 60)');
  });

  for (const name of ['title', 'hidden', 'id', 'style', 'refs']) {
    test(`a binding named ${ name } throws when the component is defined`, async ({ page }) => {
      await open(page, { body: `<template id="nb-subject"><h2 nb-text="${ name }"></h2></template>` });

      await expect(page.evaluate(() => nbhi.initialize())).rejects.toThrow(`can't bind "${ name }"`);
    });
  }
});

test.describe('nested components', () => {
  test('a binding on a component sets its property, keeping the type', async ({ page }) => {
    await open(page, {
      body: `<template id="nb-badge"><span nb-text="label"></span></template>
        <template id="nb-card"><h2 nb-text="heading"></h2><nb-badge :label="status"></nb-badge></template>
        <nb-card></nb-card>`,
    });
    await page.evaluate(async () => {
      await nbhi.initialize();
      document.querySelector('nb-card').status = 'Draft';
    });

    await expect(page.locator('nb-card nb-badge span')).toHaveText('Draft');
  });

  test('a list passes on as a list', async ({ page }) => {
    await open(page, {
      body: `<template id="nb-tags"><ul nb-each="tags"><li nb-text="value"></li></ul></template>
        <template id="nb-card"><nb-tags :tags="labels"></nb-tags></template>
        <nb-card></nb-card>`,
    });
    await page.evaluate(async () => {
      await nbhi.initialize();
      document.querySelector('nb-card').labels = ['html', 'css'];
    });

    await expect(page.locator('nb-card nb-tags li')).toHaveText(['html', 'css']);
  });
});

test.describe('refs', () => {
  test('nb-ref makes an element available as refs.name', async ({ page }) => {
    await openComponent(page, '<div nb-ref="canvas"></div>');

    expect(await page.evaluate(() => {
      const component = document.querySelector('nb-subject');
      return component.refs.canvas === component.shadowRoot.querySelector('div');
    })).toBe(true);
  });
});

test.describe('events', () => {
  test('an event from an element inside arrives with the component as target', async ({ page }) => {
    await openComponent(page, '<button>Go</button>', '<section class="parent"><nb-subject></nb-subject></section>');
    await page.evaluate(() => document.querySelector('.parent').addEventListener('click', event => {
      window.clicked = event.target.localName;
    }));
    await page.locator('nb-subject button').click();

    await expect.poll(() => page.evaluate(() => window.clicked)).toBe('nb-subject');
  });

  test('a component script can fire its own event that bubbles to a parent', async ({ page }) => {
    await open(page, {
      body: '<div class="tags"><nb-tag label="html"></nb-tag><nb-tag label="css"></nb-tag></div>',
      components: {
        tag: `<span nb-text="label"></span><button nb-ref="remove">×</button>
          <script type="module">
            export default element => {
              element.refs.remove.addEventListener('click', () => {
                element.dispatchEvent(new CustomEvent('remove', { bubbles: true, detail: { label: element.label } }));
              });
            };
          </script>`,
      },
    });
    await page.evaluate(async () => {
      await nbhi.initialize();
      document.querySelector('.tags').addEventListener('remove', event => event.target.remove());
    });
    await page.locator('nb-tag button').first().click();

    await expect(page.locator('nb-tag')).toHaveCount(1);
    await expect(page.locator('nb-tag span')).toHaveText('css');
  });
});
