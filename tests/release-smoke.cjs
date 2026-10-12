async (page) => {
  const requests = [], errors = [], checks = [];
  const check = (condition, name) => { if (!condition) throw new Error(name); checks.push(name); };
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4173');
  await page.locator('[data-action=start]').waitFor();
  check((await page.title()).includes('深海猎杀'), 'release title matches chosen name');
  check(await page.evaluate(() => !Object.prototype.hasOwnProperty.call(window, 'depthchain')), 'release removes diagnostic entry');
  await page.locator('[data-action=start]').click();
  const tutorial = page.getByRole('button', { name: '懂了，开炸！' });
  if (await tutorial.isVisible()) await tutorial.click();
  await page.keyboard.down('Space');
  await page.waitForFunction(() => document.getElementById('ammo').textContent.includes('○'));
  await page.keyboard.up('Space');
  check(true, 'release handles countdown and actual keyboard firing');
  await page.getByRole('button', { name: '暂停游戏', exact: true }).click();
  check(await page.getByRole('button', { name: '接着炸' }).isVisible(), 'release pause UI');
  check(requests.every(url => url.startsWith('http://127.0.0.1:4173/')), 'only local packaged resources requested');
  check(errors.length === 0, 'release page has no runtime errors');
  // Direct file load verifies the extracted ZIP does not need a web server.
  await page.goto('file:///F:/vibe%20coding/Codex/%E6%BD%9C%E8%89%87%E5%A4%A7%E6%88%98/dist/index.html');
  await page.locator('[data-action=start]').waitFor();
  await page.locator('[data-action=start]').click();
  if (await tutorial.isVisible()) await tutorial.click();
  await page.keyboard.down('Space');
  await page.waitForFunction(() => document.getElementById('ammo').textContent.includes('○'));
  await page.keyboard.up('Space');
  check(true, 'extracted index.html plays directly from file URL');
  await page.goto('http://127.0.0.1:4173');
  return { passed: checks.length, checks };
}
