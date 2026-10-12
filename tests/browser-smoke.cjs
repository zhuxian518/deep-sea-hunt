async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const checks = [];
  const check = (condition, name) => { if (!condition) throw new Error(name); checks.push(name); };
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(() => window.depthchain.launch(77));
  await page.waitForFunction(() => window.depthchain && window.depthchain.sim && window.depthchain.sim.status === 'playing');
  const x = await page.evaluate(() => window.depthchain.sim.player.x);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(start => window.depthchain.sim.player.x > start + 30, x);
  await page.keyboard.down('Space');
  await page.waitForFunction(() => window.depthchain.sim.bombs.length > 0);
  await page.keyboard.up('Space'); await page.keyboard.up('ArrowRight');
  check(await page.evaluate(() => window.depthchain.input.sample().moveAxis === 0 && !window.depthchain.input.sample().fireHeld), 'keyboard move + fire + release');
  await page.getByRole('button', { name: '暂停游戏', exact: true }).click();
  const tick = await page.evaluate(() => window.depthchain.sim.tick);
  await page.waitForFunction(() => window.depthchain.state === 'paused');
  await page.getByRole('button', { name: '低特效：关闭' }).click();
  check(await page.evaluate(() => window.depthchain.renderer.lowFx === true), 'mobile pause exposes low effects setting');
  await page.getByRole('button', { name: '低特效：开启' }).click();
  await page.screenshot({ path: 'output/playwright/mobile-pause.png' });
  check(await page.evaluate(value => window.depthchain.sim.tick === value, tick), 'pause stops simulation');
  await page.getByRole('button', { name: '这局重来', exact: true }).click();
  check(await page.getByRole('button', { name: '重来！' }).isVisible(), 'restart confirmation shown');
  await page.getByRole('button', { name: '先不退' }).click();
  await page.getByRole('button', { name: '接着炸' }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  check(await page.evaluate(() => window.depthchain.state === 'paused'), 'blur auto-pauses');
  await page.getByRole('button', { name: '接着炸' }).click();

  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  const left = await page.getByRole('button', { name: '向左移动', exact: true }).boundingBox();
  const fire = await page.getByRole('button', { name: '投放深水炸弹', exact: true }).boundingBox();
  const points = [{ x: left.x + left.width / 2, y: left.y + left.height / 2, id: 1 }, { x: fire.x + fire.width / 2, y: fire.y + fire.height / 2, id: 2 }];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  await page.waitForFunction(() => window.depthchain.input.sample().moveAxis === -1 && window.depthchain.input.sample().fireHeld);
  check(await page.evaluate(() => window.depthchain.input.sample().moveAxis === -1 && window.depthchain.input.sample().fireHeld), 'two real touch pointers move and fire simultaneously');
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.waitForFunction(() => window.depthchain.input.sample().moveAxis === 0 && !window.depthchain.input.sample().fireHeld);
  check(await page.evaluate(() => window.depthchain.input.sample().moveAxis === 0 && !window.depthchain.input.sample().fireHeld), 'touch cancellation releases all pointers');
  await client.detach();

  for (const [w, h] of [[360, 640], [390, 844], [430, 932]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForFunction(height => document.documentElement.style.getPropertyValue('--viewport-height') === `${height}px`, h);
    const layout = await page.evaluate(() => { const r = document.querySelector('.controls').getBoundingClientRect(); const b = document.querySelector('#sea').getBoundingClientRect(); return { bottom: r.bottom, width: document.documentElement.scrollWidth, height: innerHeight, battle: b.height }; });
    check(layout.bottom <= h && layout.width <= w && layout.battle > 300, `layout ${w}x${h} contains controls and full world`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'output/playwright/mobile-playing.png' });

  // Controlled visual fixture: use the real engine, five stationary targets and a real bomb.
  await page.evaluate(() => {
    const app = window.depthchain; app.launch(53); const s = app.sim;
    s.status = 'playing'; s.spawned = s.waves[0].count;
    for (let i = 0; i < 5; i++) { const sub = s.addSub('S01', 240 + i * 130, 520); sub.vx = 0; }
    s.bombs.push({ id: s.id++, x: 240, y: 495, px: 240, py: 495, alive: true });
    s.step(1 / 60); app.renderer.consume(s.drainEvents()); app.renderer.update(1 / 60);
    app.state = 'paused'; app.input.setEnabled(false);
  });
  await page.screenshot({ path: 'output/playwright/mobile-one-hit.png' });
  await page.evaluate(() => { const app = window.depthchain; for (let i = 0; i < 33; i++) { app.sim.step(1 / 60); app.renderer.consume(app.sim.drainEvents()); app.renderer.update(1 / 60); } });
  check(await page.evaluate(() => window.depthchain.sim.maxCombo === 5 && window.depthchain.sim.kills === 5 && window.depthchain.sim.score === 1249), 'five-chain visual fixture uses genuine depth bonus and scoring');
  await page.screenshot({ path: 'output/playwright/mobile-five-chain.png' });
  await page.evaluate(() => { window.depthchain.sim.end('浏览器验收场景'); window.depthchain.finish(); });
  check(await page.getByRole('button', { name: '再炸一波' }).isVisible(), 'result screen');
  await page.screenshot({ path: 'output/playwright/mobile-result.png' });
  await page.getByRole('button', { name: '看看成绩卡 / 晒一下' }).click();
  check(await page.locator('#score-preview').evaluate(img => img.naturalWidth === 720), 'score postcard generated');
  await page.getByRole('button', { name: '分享到小红书', exact: true }).click();
  check(await page.locator('#toast').evaluate(el => el.textContent.includes('到小红书')), 'browser share explains unavailable SDK');
  await page.getByRole('button', { name: '回去看成绩', exact: true }).click();
  await page.getByRole('button', { name: '再炸一波' }).click();
  check(await page.evaluate(() => window.depthchain.sim.score === 0 && window.depthchain.sim.kills === 0 && window.depthchain.sim.wave === 0), 'restart resets score, enemies and wave');
  await page.getByRole('button', { name: '暂停游戏', exact: true }).click();
  await page.getByRole('button', { name: '退出这局', exact: true }).click();
  await page.getByRole('button', { name: '退出这局' }).click();
  await page.reload();
  await page.waitForFunction(() => window.depthchain && window.depthchain.state === 'home');
  check(await page.evaluate(() => window.depthchain.profile.bestScore >= 1249 && window.depthchain.profile.bestCombo >= 5), 'record restored after reload');
  await page.screenshot({ path: 'output/playwright/mobile-home.png' });

  await page.context().setOffline(true);
  await page.locator('[data-action=start]').click();
  await page.waitForFunction(() => window.depthchain.sim && window.depthchain.sim.status === 'playing');
  check(await page.evaluate(() => window.depthchain.state === 'game'), 'already-loaded game starts fully offline');
  await page.context().setOffline(false);
  await page.evaluate(() => window.depthchain.home());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'output/playwright/desktop-home.png' });
  check(errors.length === 0, `no page errors: ${errors.join(';')}`);
  return { passed: checks.length, checks };
}
