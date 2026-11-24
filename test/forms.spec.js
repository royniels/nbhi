import { test, expect } from '@playwright/test';
import { open } from './support/open.js';

const input = `<template id="nb-input">
  <label>
    <span nb-text="label"></span>
    <input :value="value" :required="required" :placeholder="placeholder" :type="type">
  </label>
</template>`;

async function openForm(page, fields, components = input) {
  await open(page, { body: `${ components }<form>${ fields }<button>Save</button></form>` });
  await page.evaluate(() => nbhi.initialize());
}

function formValue(page, name) {
  return page.evaluate(name => new FormData(document.querySelector('form')).get(name), name);
}

test('value on the component sets the field and is in the form data', async ({ page }) => {
  await openForm(page, '<nb-input name="title" label="Title"></nb-input>');
  await page.evaluate(() => {
    document.querySelector('nb-input').value = 'Getting started';
  });

  await expect(page.locator('nb-input input')).toHaveValue('Getting started');
  expect(await formValue(page, 'title')).toBe('Getting started');
});

test('typing updates the value and the form data', async ({ page }) => {
  await openForm(page, '<nb-input name="title"></nb-input>');
  await page.locator('nb-input input').fill('Typed');

  expect(await page.evaluate(() => document.querySelector('nb-input').value)).toBe('Typed');
  expect(await formValue(page, 'title')).toBe('Typed');
});

test('a value attribute in the HTML is the starting value', async ({ page }) => {
  await openForm(page, '<nb-input name="title" value="From HTML"></nb-input>');

  await expect(page.locator('nb-input input')).toHaveValue('From HTML');
  expect(await formValue(page, 'title')).toBe('From HTML');
});

test.describe('validation', () => {
  test('the validity of the field is the validity of the component', async ({ page }) => {
    await openForm(page, '<nb-input name="title" required></nb-input>');

    expect(await page.evaluate(() => {
      const component = document.querySelector('nb-input');
      const field = component.shadowRoot.querySelector('input');
      return {
        valid: component.checkValidity(),
        valueMissing: component.validity.valueMissing,
        sameMessage: component.validationMessage === field.validationMessage && component.validationMessage !== '',
        formValid: document.querySelector('form').checkValidity(),
      };
    })).toEqual({ valid: false, valueMissing: true, sameMessage: true, formValid: false });
    await expect(page.locator('nb-input:invalid')).toHaveCount(1);
  });

  test('the validity follows the value', async ({ page }) => {
    await openForm(page, '<nb-input name="title" required></nb-input>');
    await page.locator('nb-input input').fill('Filled');

    expect(await page.evaluate(() => document.querySelector('nb-input').checkValidity())).toBe(true);
    await expect(page.locator('nb-input:invalid')).toHaveCount(0);
  });

  test('the type of the field validates too', async ({ page }) => {
    await openForm(page, '<nb-input name="email" type="email"></nb-input>');
    await page.locator('nb-input input').fill('not an email');

    expect(await page.evaluate(() => document.querySelector('nb-input').validity.typeMismatch)).toBe(true);
  });

  test('submitting an invalid form is stopped', async ({ page }) => {
    await openForm(page, '<nb-input name="title" required></nb-input>');
    await page.evaluate(() => document.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      window.submitted = true;
    }));
    await page.locator('form button').click();

    expect(await page.evaluate(() => window.submitted)).toBeUndefined();
  });
});

test('a checkbox uses checked, and is in the form data only when checked', async ({ page }) => {
  await openForm(page, '<nb-checkbox name="agree"></nb-checkbox>', '<template id="nb-checkbox"><input type="checkbox" value="yes" :checked="checked"></template>');

  expect(await formValue(page, 'agree')).toBeNull();
  await page.evaluate(() => {
    document.querySelector('nb-checkbox').checked = true;
  });
  await expect(page.locator('nb-checkbox input')).toBeChecked();
  expect(await formValue(page, 'agree')).toBe('yes');

  await page.locator('nb-checkbox input').uncheck();
  expect(await page.evaluate(() => document.querySelector('nb-checkbox').checked)).toBe(false);
});

test('nb-ref="field" chooses the field', async ({ page }) => {
  await openForm(page, '<nb-search name="query"></nb-search>', '<template id="nb-search"><input class="filter"><input class="main" nb-ref="field"></template>');
  await page.locator('nb-search .main').fill('Main');

  expect(await formValue(page, 'query')).toBe('Main');
});

test('resetting the form puts the field back to its starting value', async ({ page }) => {
  await openForm(page, '<nb-input name="title" value="Start"></nb-input>');
  await page.locator('nb-input input').fill('Changed');
  await page.evaluate(() => document.querySelector('form').reset());

  await expect(page.locator('nb-input input')).toHaveValue('Start');
  expect(await formValue(page, 'title')).toBe('Start');
});

test('a disabled fieldset disables the field', async ({ page }) => {
  await openForm(page, '<fieldset disabled><nb-input name="title"></nb-input></fieldset>');

  await expect(page.locator('nb-input input')).toBeDisabled();
});

test('focus() on the component focuses the field', async ({ page }) => {
  await openForm(page, '<nb-input name="title"></nb-input>');
  await page.evaluate(() => document.querySelector('nb-input').focus());

  await expect(page.locator('nb-input input')).toBeFocused();
});

test('change from the field is fired again from the component', async ({ page }) => {
  await openForm(page, '<nb-input name="title"></nb-input>');
  await page.evaluate(() => document.querySelector('form').addEventListener('change', event => {
    window.changed = event.target.localName;
  }));
  await page.locator('nb-input input').fill('Changed');
  await page.locator('nb-input input').blur();

  await expect.poll(() => page.evaluate(() => window.changed)).toBe('nb-input');
});

test('a select component submits the chosen option', async ({ page }) => {
  await openForm(page, '<nb-select name="reviewer"></nb-select>', `<template id="nb-select">
    <select :value="value" nb-each="options"><option :value="value" nb-text="label"></option></select>
  </template>`);
  await page.evaluate(() => {
    document.querySelector('nb-select').options = [{ value: 'u-1', label: 'Ada' }, { value: 'u-2', label: 'Grace' }];
  });
  await page.locator('nb-select select').selectOption('u-2');

  expect(await formValue(page, 'reviewer')).toBe('u-2');
});

test('a component without a form field is not a form control', async ({ page }) => {
  await open(page, { body: '<template id="nb-card"><p nb-text="heading"></p></template><nb-card></nb-card>' });
  await page.evaluate(() => nbhi.initialize());

  expect(await page.evaluate(() => ({
    formAssociated: customElements.get('nb-card').formAssociated,
    hasValue: 'value' in document.querySelector('nb-card'),
  }))).toEqual({ formAssociated: false, hasValue: false });
});
