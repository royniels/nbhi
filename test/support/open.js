import path from 'node:path';

export { open };

const root = path.resolve(import.meta.dirname, '..', '..');
const origin = 'https://nbhi.test';

// Serves a page with nbhi in window.nbhi, the components as files under
// /components/<name>.html and any other file under its own path. Nothing is
// served from disk except the library itself, so every test shows its whole setup
async function open(page, { head = '', body = '', components = {}, files = {}, delays = {}, imports = {} } = {}) {
  const requests = [];

  await page.route(`${ origin }/**`, async route => {
    const { pathname } = new URL(route.request().url());
    requests.push(pathname);

    if (delays[pathname]) {
      await new Promise(resolve => setTimeout(resolve, delays[pathname]));
    }

    if (pathname === '/') {
      return route.fulfill({ contentType: 'text/html', body: document() });
    }
    if (pathname.startsWith('/javascript/')) {
      return route.fulfill({ path: path.join(root, pathname) });
    }
    if (files[pathname] !== undefined) {
      const contentType = pathname.endsWith('.css') ? 'text/css' : 'text/javascript';
      return route.fulfill({ contentType, body: files[pathname] });
    }
    const name = pathname.match(/^\/components\/(.+)\.html$/)?.[1];
    if (name && components[name] !== undefined) {
      return route.fulfill({ contentType: 'text/html', body: components[name] });
    }
    return route.fulfill({ status: 404, body: 'Not found' });
  });

  await page.goto(`${ origin }/`);
  await page.waitForFunction(() => window.nbhi);

  return {
    requests,
    requestCount: pathname => requests.filter(request => request === pathname).length,
  };

  function document() {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <script type="importmap">${ JSON.stringify({ imports: { nbhi: '/javascript/index.js', ...imports } }) }</script>
    ${ head }
  </head>
  <body>
    ${ body }
    <script type="module">
      import * as nbhi from 'nbhi';
      window.nbhi = nbhi;
    </script>
  </body>
</html>`;
  }
}
