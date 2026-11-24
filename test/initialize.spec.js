import { test, expect } from '@playwright/test';
import { open } from './support/open.js';

test.describe('inline templates', () => {
  test('a <template> with an id defines a component', async ({ page }) => {
    await open(page, {
      body: '<template id="nb-card"><p><slot>Default</slot></p></template><nb-card>Hello</nb-card>',
    });
    await page.evaluate(() => nbhi.initialize());

    await expect(page.locator('nb-card p')).toBeVisible();
    expect(await page.evaluate(() => {
      const slot = document.querySelector('nb-card').shadowRoot.querySelector('slot');
      return slot.assignedNodes()[0].textContent;
    })).toBe('Hello');
  });

  test('a <template> whose id lacks the prefix is left alone', async ({ page }) => {
    await open(page, {
      body: '<template class="row"><p>Row</p></template><template id="nb-card"><template id="item"><li></li></template></template>',
    });
    await page.evaluate(() => nbhi.initialize());

    expect(await page.evaluate(() => ({
      card: Boolean(customElements.get('nb-card')),
      nested: Boolean(customElements.get('nb-card-child')),
    }))).toEqual({ card: true, nested: false });
  });

  test('an empty prefix throws', async ({ page }) => {
    await open(page);

    await expect(page.evaluate(() => nbhi.initialize({ prefix: '' }))).rejects.toThrow('prefix option');
  });
});

test.describe('component files', () => {
  test('loads a component from <source>/<name without prefix>.html', async ({ page }) => {
    const { requestCount } = await open(page, {
      body: '<nb-card></nb-card>',
      components: { card: '<p>From file</p>' },
    });
    await page.evaluate(() => nbhi.initialize({ source: '/components' }));

    await expect(page.locator('nb-card p')).toHaveText('From file');
    expect(requestCount('/components/card.html')).toBe(1);
  });

  test('loads a component from a map of names to paths', async ({ page }) => {
    await open(page, {
      body: '<nb-card></nb-card>',
      components: { 'renamed-card': '<p>Mapped</p>' },
    });
    await page.evaluate(() => nbhi.initialize({ source: { card: '/components/renamed-card.html' } }));

    await expect(page.locator('nb-card p')).toHaveText('Mapped');
  });

  test('a missing component file throws with its name', async ({ page }) => {
    await open(page, { body: '<nb-missing></nb-missing>' });

    await expect(page.evaluate(() => nbhi.initialize())).rejects.toThrow('Could not find component nb-missing');
  });

  test('ignores elements without the prefix', async ({ page }) => {
    const { requests } = await open(page, { body: '<other-card></other-card><nbx-card></nbx-card>' });
    await page.evaluate(() => nbhi.initialize());

    expect(requests.filter(request => request.startsWith('/components/'))).toEqual([]);
  });

  test('defines a nested component before the component around it', async ({ page }) => {
    await open(page, {
      body: '<nb-parent></nb-parent>',
      delays: { '/components/child.html': 300 },
      components: {
        parent: `<nb-child></nb-child>
          <script>
            export default element => {
              element.dataset.childDefined = Boolean(customElements.get('nb-child'));
            };
          </script>`,
        child: '<span>Child</span>',
      },
    });
    await page.evaluate(() => nbhi.initialize());

    await expect(page.locator('nb-parent')).toHaveAttribute('data-child-defined', 'true');
  });

  test('fetches a component used by two other components once', async ({ page }) => {
    const { requestCount } = await open(page, {
      body: '<nb-first></nb-first><nb-second></nb-second>',
      components: {
        first: '<nb-shared></nb-shared>',
        second: '<nb-shared></nb-shared>',
        shared: '<span>Shared</span>',
      },
    });
    await page.evaluate(() => nbhi.initialize());

    await expect(page.locator('nb-shared span')).toHaveCount(2);
    expect(requestCount('/components/shared.html')).toBe(1);
  });

  test('a component that contains itself does not hang', async ({ page }) => {
    await open(page, {
      body: '<nb-tree></nb-tree>',
      components: { tree: '<ul><li><nb-tree hidden></nb-tree></li></ul>' },
    });

    await page.evaluate(() => nbhi.initialize());
    expect(await page.evaluate(() => Boolean(customElements.get('nb-tree')))).toBe(true);
  });

  test('defines a component that is added after initialize()', async ({ page }) => {
    await open(page, {
      body: '<nb-early></nb-early>',
      components: { early: '<p>Early</p>', late: '<p>Late</p>' },
    });
    await page.evaluate(() => nbhi.initialize());
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<section><nb-late></nb-late></section>'));

    await expect(page.locator('nb-late p')).toHaveText('Late');
  });

  test('defines a component that a component script adds to its own shadow root', async ({ page }) => {
    await open(page, {
      body: '<nb-host></nb-host>',
      components: {
        host: `<div></div>
          <script>
            export default element => {
              element.shadowRoot.querySelector('div').innerHTML = '<nb-badge></nb-badge>';
            };
          </script>`,
        badge: '<span>Badge</span>',
      },
    });
    await page.evaluate(() => nbhi.initialize());

    await expect(page.locator('nb-badge span')).toHaveText('Badge');
  });

  test('logs a missing component that is added after initialize()', async ({ page }) => {
    await open(page);
    await page.evaluate(() => nbhi.initialize());
    const message = page.waitForEvent('console', message => message.text().includes('Could not find component'));
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<nb-missing></nb-missing>'));

    expect((await message).text()).toContain('Could not find component nb-missing');
    expect((await message).type()).toBe('error');
  });
});

test.describe('component scripts', () => {
  test('runs the default export with the element, importing through the import map', async ({ page }) => {
    await open(page, {
      body: '<nb-card></nb-card>',
      imports: { greeting: '/modules/greeting.js' },
      files: { '/modules/greeting.js': 'export default "Hello from a module";' },
      components: {
        card: `<p nb-text="message"></p>
          <script type="module">
            import greeting from 'greeting';
            export default element => {
              element.message = greeting;
            };
          </script>`,
      },
    });
    await page.evaluate(() => nbhi.initialize());

    await expect(page.locator('nb-card p')).toHaveText('Hello from a module');
  });

  test('a root path in a component script does not resolve', async ({ page }) => {
    await open(page, {
      body: '<nb-card></nb-card>',
      files: { '/modules/greeting.js': 'export default "Hello";' },
      components: { card: '<p></p><script type="module">import "/modules/greeting.js";</script>' },
    });

    await expect(page.evaluate(() => nbhi.initialize())).rejects.toThrow();
  });

  test('runs the module body once per component, not per instance', async ({ page }) => {
    await open(page, {
      body: '<nb-card></nb-card><nb-card></nb-card>',
      components: {
        card: `<p></p>
          <script type="module">
            window.moduleRuns = (window.moduleRuns ?? 0) + 1;
            export default () => {
              window.instanceRuns = (window.instanceRuns ?? 0) + 1;
            };
          </script>`,
      },
    });
    await page.evaluate(() => nbhi.initialize());

    await expect.poll(() => page.evaluate(() => window.instanceRuns)).toBe(2);
    expect(await page.evaluate(() => window.moduleRuns)).toBe(1);
  });

  test('does not run the script again when the element is moved', async ({ page }) => {
    await open(page, {
      body: '<section class="from"><nb-card></nb-card></section><section class="to"></section>',
      components: {
        card: `<p></p>
          <script>
            export default () => {
              window.runs = (window.runs ?? 0) + 1;
            };
          </script>`,
      },
    });
    await page.evaluate(() => nbhi.initialize());
    await page.evaluate(() => document.querySelector('.to').append(document.querySelector('nb-card')));

    expect(await page.evaluate(() => window.runs)).toBe(1);
  });
});

test.describe('component setup', () => {
  test('a component with a form field is form associated', async ({ page }) => {
    await open(page, {
      body: '<nb-field></nb-field><nb-card></nb-card>',
      components: { field: '<input name="title">', card: '<p></p>' },
    });
    await page.evaluate(() => nbhi.initialize());

    expect(await page.evaluate(() => ({
      field: customElements.get('nb-field').formAssociated,
      card: customElements.get('nb-card').formAssociated,
    }))).toEqual({ field: true, card: false });
  });

  test('copies stylesheets marked data-inherit into every component', async ({ page }) => {
    await open(page, {
      head: '<style data-inherit="true">p { color: rgb(255, 0, 0); }</style><style>p { font-style: italic; }</style>',
      body: '<nb-card></nb-card>',
      components: { card: '<p>Styled</p>' },
    });
    await page.evaluate(() => nbhi.initialize());

    await expect(page.locator('nb-card p')).toHaveCSS('color', 'rgb(255, 0, 0)');
    await expect(page.locator('nb-card p')).toHaveCSS('font-style', 'normal');
  });
});
