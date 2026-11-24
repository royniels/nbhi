import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test',
  fullyParallel: true,
  forbidOnly: true,
  reporter: 'list',
  use: {
    browserName: 'chromium',
  },
});
