import { test, expect } from '@playwright/test';
import { open } from './support/open.js';

const table = `<table class="articles">
  <thead><tr><th>Title</th><th>Status</th></tr></thead>
  <tbody><tr><td><a :href="link" nb-text="title"></a></td><td nb-text="status"></td></tr></tbody>
</table>`;

// Marks every rendered row, so a test can tell a kept row from a new one
function markRows(page) {
  return page.evaluate(() => document.querySelectorAll('.articles tbody tr').forEach((row, index) => {
    row.dataset.mark = index;
  }));
}

function render(page, records) {
  return page.evaluate(records => nbhi.rows(document.querySelector('.articles'), records), records);
}

test.describe('where the rows go', () => {
  test('a table gets a row per record from the first row of its tbody', async ({ page }) => {
    await open(page, { body: table });
    await render(page, [{ id: 1, title: 'Getting started', status: 'Draft', link: '/articles/1' }, { id: 2, title: 'Slots', status: 'Published' }]);

    await expect(page.locator('.articles tbody tr')).toHaveText(['Getting startedDraft', 'SlotsPublished']);
    await expect(page.locator('.articles tbody a').first()).toHaveAttribute('href', '/articles/1');
  });

  test('a list gets an item per record', async ({ page }) => {
    await open(page, { body: '<ul class="list"><li nb-text="title"></li></ul>' });
    await page.evaluate(() => nbhi.rows(document.querySelector('.list'), [{ title: 'One' }, { title: 'Two' }]));

    await expect(page.locator('.list li')).toHaveText(['One', 'Two']);
  });

  test('a select gets an option per record', async ({ page }) => {
    await open(page, { body: '<select class="list"><option :value="value" nb-text="label"></option></select>' });
    await page.evaluate(() => nbhi.rows(document.querySelector('.list'), [{ value: 'a', label: 'First' }, { value: 'b', label: 'Second' }]));

    await expect(page.locator('.list option')).toHaveText(['First', 'Second']);
    await expect(page.locator('.list option').last()).toHaveAttribute('value', 'b');
  });

  test('any other element repeats its first child', async ({ page }) => {
    await open(page, { body: '<div class="list"><article><h3 nb-text="title"></h3></article></div>' });
    await page.evaluate(() => nbhi.rows(document.querySelector('.list'), [{ title: 'One' }, { title: 'Two' }]));

    await expect(page.locator('.list article')).toHaveText(['One', 'Two']);
  });

  test('an element without a first child throws', async ({ page }) => {
    await open(page, { body: '<ul class="list"></ul>' });

    await expect(page.evaluate(() => nbhi.rows(document.querySelector('.list'), ['One']))).rejects.toThrow('row template');
  });

  test('strings and numbers are used as { id: value, value }', async ({ page }) => {
    await open(page, { body: '<ul class="list"><li nb-text="value"></li></ul>' });
    await page.evaluate(() => nbhi.rows(document.querySelector('.list'), ['html', 'css', 3]));

    await expect(page.locator('.list li')).toHaveText(['html', 'css', '3']);
  });

  test('a row can hold a component that gets its property', async ({ page }) => {
    await open(page, {
      body: `<template id="nb-badge"><span nb-text="label"></span></template>
        <ul class="list"><li><nb-badge :label="status"></nb-badge></li></ul>`,
    });
    await page.evaluate(async () => {
      await nbhi.initialize();
      nbhi.rows(document.querySelector('.list'), [{ id: 1, status: 'Draft' }, { id: 2, status: 'Published' }]);
    });

    await expect(page.locator('.list nb-badge span')).toHaveText(['Draft', 'Published']);
  });

  test('nb-text inside a row shows markup as text', async ({ page }) => {
    await open(page, { body: '<ul class="list"><li nb-text="title"></li></ul>' });
    await page.evaluate(() => nbhi.rows(document.querySelector('.list'), [{ title: '<b>Bold</b>' }]));

    await expect(page.locator('.list li')).toHaveText('<b>Bold</b>');
  });
});

test.describe('keeping rows', () => {
  test('a record with an id keeps its row when the data is loaded again', async ({ page }) => {
    await open(page, { body: table });
    await render(page, [{ id: 1, title: 'A' }, { id: 2, title: 'B' }]);
    await markRows(page);
    await render(page, [{ id: 1, title: 'A2' }, { id: 2, title: 'B2' }]);

    await expect(page.locator('.articles tbody tr[data-mark]')).toHaveCount(2);
    await expect(page.locator('.articles tbody a')).toHaveText(['A2', 'B2']);
  });

  test('a new order moves the rows', async ({ page }) => {
    await open(page, { body: table });
    await render(page, [{ id: 1, title: 'A' }, { id: 2, title: 'B' }, { id: 3, title: 'C' }]);
    await markRows(page);
    await render(page, [{ id: 3, title: 'C' }, { id: 1, title: 'A' }, { id: 2, title: 'B' }]);

    await expect(page.locator('.articles tbody a')).toHaveText(['C', 'A', 'B']);
    await expect(page.locator('.articles tbody tr[data-mark]')).toHaveCount(3);
  });

  test('a focused field in a row keeps focus when the rows move', async ({ page }) => {
    await open(page, { body: '<ul class="list"><li><input :value="title"></li></ul>' });
    await page.evaluate(() => {
      window.render = records => nbhi.rows(document.querySelector('.list'), records);
      window.render([{ id: 1, title: 'A' }, { id: 2, title: 'B' }]);
    });
    await page.locator('.list input').last().focus();
    await page.evaluate(() => window.render([{ id: 2, title: 'B' }, { id: 1, title: 'A' }]));

    await expect(page.locator('.list input').first()).toBeFocused();
  });

  test('a removed record removes its row', async ({ page }) => {
    await open(page, { body: table });
    await render(page, [{ id: 1, title: 'A' }, { id: 2, title: 'B' }]);
    await render(page, [{ id: 2, title: 'B' }]);

    await expect(page.locator('.articles tbody a')).toHaveText(['B']);
  });

  test('records with the same id both get a row', async ({ page }) => {
    await open(page, { body: table });
    await render(page, [{ id: 1, title: 'A' }, { id: 1, title: 'B' }]);

    await expect(page.locator('.articles tbody a')).toHaveText(['A', 'B']);
  });

  test('records without an id are matched by position', async ({ page }) => {
    await open(page, { body: table });
    await render(page, [{ title: 'A' }, { title: 'B' }]);
    await markRows(page);
    await render(page, [{ title: 'A2' }, { title: 'B2' }, { title: 'C2' }]);

    await expect(page.locator('.articles tbody a')).toHaveText(['A2', 'B2', 'C2']);
    await expect(page.locator('.articles tbody tr[data-mark]')).toHaveCount(2);
  });

  test('a record changed in place shows its new values', async ({ page }) => {
    await open(page, { body: table });
    await page.evaluate(() => {
      const records = [{ id: 1, title: 'A' }];
      nbhi.rows(document.querySelector('.articles'), records);
      records[0].title = 'Changed';
      nbhi.rows(document.querySelector('.articles'), records);
    });

    await expect(page.locator('.articles tbody a')).toHaveText(['Changed']);
  });

  test('a key that is missing from the record empties its binding', async ({ page }) => {
    await open(page, { body: table });
    await render(page, [{ id: 1, title: 'A', status: 'Draft', link: '/a' }]);
    await render(page, [{ id: 1, title: 'A' }]);

    await expect(page.locator('.articles tbody td').last()).toHaveText('');
    await expect(page.locator('.articles tbody a')).not.toHaveAttribute('href');
  });

  test('calling rows() again from anywhere continues with the rows that are there', async ({ page }) => {
    await open(page, { body: table });
    await render(page, [{ id: 1, title: 'A', status: 'Draft' }]);
    await markRows(page);
    await render(page, [{ id: 1, title: 'A' }, { id: 2, title: 'B' }]);

    await expect(page.locator('.articles tbody a')).toHaveText(['A', 'B']);
    await expect(page.locator('.articles tbody td:nth-child(2)')).toHaveText(['', '']);
    await expect(page.locator('.articles tbody tr[data-mark]')).toHaveCount(1);
  });
});

test('a function passed to rows() runs for every row after the bindings', async ({ page }) => {
  await open(page, { body: '<ul class="list"><li><span nb-text="title"></span><button>Archive</button></li></ul>' });
  await page.evaluate(() => {
    window.archived = [];
    nbhi.rows(document.querySelector('.list'), [{ id: 1, title: 'A' }, { id: 2, title: 'B' }], (row, record) => {
      row.querySelector('button').onclick = () => window.archived.push(record.id);
      row.dataset.title = row.querySelector('span').textContent;
    });
  });
  await page.locator('.list button').last().click();

  await expect.poll(() => page.evaluate(() => window.archived)).toEqual([2]);
  await expect(page.locator('.list li').first()).toHaveAttribute('data-title', 'A');
});

test.describe('lists inside a component', () => {
  const select = `<template id="nb-select">
    <label>
      <span nb-text="label"></span>
      <select :value="value" nb-each="options">
        <option :value="value" nb-text="label"></option>
      </select>
    </label>
  </template>
  <nb-select></nb-select>`;

  test('nb-each makes a property that takes a list, read from each record', async ({ page }) => {
    await open(page, { body: select });
    await page.evaluate(async () => {
      await nbhi.initialize();
      const component = document.querySelector('nb-select');
      component.label = 'Reviewer';
      component.options = [{ value: 'u-1', label: 'Ada' }, { value: 'u-2', label: 'Grace' }];
      component.value = 'u-2';
    });

    await expect(page.locator('nb-select label > span')).toHaveText('Reviewer');
    await expect(page.locator('nb-select option')).toHaveText(['Ada', 'Grace']);
    await expect(page.locator('nb-select select')).toHaveValue('u-2');
  });

  test('the row template is not shown before the list is set', async ({ page }) => {
    await open(page, { body: select });
    await page.evaluate(() => nbhi.initialize());

    await expect(page.locator('nb-select option')).toHaveCount(0);
  });

  test('a value set before the options is selected once they arrive', async ({ page }) => {
    await open(page, { body: select });
    await page.evaluate(async () => {
      await nbhi.initialize();
      const component = document.querySelector('nb-select');
      component.value = 'u-2';
      component.options = [{ value: 'u-1', label: 'Ada' }, { value: 'u-2', label: 'Grace' }];
    });

    await expect(page.locator('nb-select select')).toHaveValue('u-2');
  });

  test('a choice of the user stays when the options are loaded again', async ({ page }) => {
    await open(page, { body: select });
    await page.evaluate(async () => {
      await nbhi.initialize();
      document.querySelector('nb-select').options = [{ value: 'u-1', label: 'Ada' }, { value: 'u-2', label: 'Grace' }];
    });
    await page.locator('nb-select select').selectOption('u-2');
    await page.evaluate(() => {
      document.querySelector('nb-select').options = [{ value: 'u-1', label: 'Ada' }, { value: 'u-2', label: 'Grace' }, { value: 'u-3', label: 'Alan' }];
    });

    await expect(page.locator('nb-select select')).toHaveValue('u-2');
  });
});
