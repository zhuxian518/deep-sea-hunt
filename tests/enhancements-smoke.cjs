async (page) => {
  const checks = [], errors = [];
  const check = (ok, name) => { if (!ok) throw Error(name); checks.push(name); };
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4173');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => window.depthchain && window.depthchain.state === 'home');
  if (await page.getByRole('button', { name: '关闭背景音乐', exact: true }).count()) await page.getByRole('button', { name: '关闭背景音乐', exact: true }).click();
  await page.getByRole('button', { name: '开启背景音乐', exact: true }).click();
  await page.locator('[data-action=start]').click();
  await page.waitForFunction(() => window.depthchain.audio.musicNotes.size > 0 && window.depthchain.audio.context.state === 'running');
  check(await page.evaluate(() => window.depthchain.audio.musicActive && window.depthchain.profile.settings.music), 'music starts after explicit gesture');
  if (await page.getByRole('button', { name: '开启音效', exact: true }).count()) await page.getByRole('button', { name: '开启音效', exact: true }).click();
  await page.getByRole('button', { name: '关闭音效', exact: true }).click();
  await page.waitForFunction(() => window.depthchain.audio.musicNotes.size > 0);
  check(await page.evaluate(() => !window.depthchain.audio.enabled && window.depthchain.audio.musicEnabled), 'music independent of sound effects');
  await page.getByRole('button', { name: '关闭背景音乐', exact: true }).click();
  check(await page.evaluate(() => window.depthchain.audio.musicNotes.size === 0), 'music off cancels current and queued notes');
  await page.getByRole('button', { name: '开启背景音乐', exact: true }).click();
  await page.waitForFunction(() => window.depthchain.audio.musicNotes.size > 0);
  await page.getByRole('button', { name: '暂停游戏', exact: true }).click();
  check(await page.evaluate(() => !window.depthchain.audio.musicActive && window.depthchain.audio.musicNotes.size === 0), 'pause stops background music');
  const paused = await page.evaluate(() => ({ t: window.depthchain.renderer.time, tick: window.depthchain.sim.tick }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  check(await page.evaluate(p => window.depthchain.renderer.time === p.t && window.depthchain.sim.tick === p.tick, paused), 'pause freezes trails, animation and simulation');
  await page.getByRole('button', { name: '接着炸' }).click();
  await page.waitForFunction(() => window.depthchain.audio.musicNotes.size > 0);
  check(await page.evaluate(() => window.depthchain.audio.musicNotes.size <= 32), 'resuming music has bounded active notes');
  await page.evaluate(() => window.depthchain.home());
  check(await page.evaluate(() => window.depthchain.audio.musicNotes.size === 0), 'return home stops music');
  await page.reload(); await page.waitForFunction(() => window.depthchain && window.depthchain.state === 'home');
  check(await page.evaluate(() => window.depthchain.profile.settings.music && !window.depthchain.profile.settings.sfx), 'audio preferences survive reload');

  await page.evaluate(() => {
    const app = window.depthchain; app.launch(62); const s = app.sim;
    s.wave = 7; s.setupWave(); s.status = 'playing'; s.spawned = s.waves[7].count;
    for (let i = 0; i < 5; i++) { const sub = s.addSub(`S0${i + 1}`, 180 + (i % 3) * 270, 330 + i * 145, i % 2 ? -1 : 1); sub.attack = 100; }
    s.pickups.push({ id: s.id++, type: 'shield', x: 500, y: 180, px: 500, py: 180, age: 0 });
    s.step(1/60); app.renderer.consume(s.drainEvents());
    s.grantPowerup('heavy'); s.grantPowerup('rapid');
    s.bombs = [0.12, 0.44, 0.8].map((age, i) => ({ id: s.id++, x: 420 + i * 60, px: 420 + i * 60, y: 270 + i * 130, py: 270 + i * 130, age, power: i === 2 ? 1.35 : 1, alive: true }));
    s.torpedoes = [{ id: s.id++, x: 290, px: 290, y: 650, py: 650, vx: 0, speed: 220, alive: true }, { id: s.id++, x: 750, px: 750, y: 500, py: 500, vx: -60, speed: 235, homing: true, alive: true }];
    s.pickups.push({ id: s.id++, type: 'heavy', x: 740, px: 740, y: 830, py: 830, age: 1 });
    s.explosions = [{ id: s.id++, x: 500, y: 980, radius: 75, age: 0.15, damaged: new Set() }];
    app.renderer.consume([{ id: 900, type: 'kill', x: 500, y: 980, points: 375, combo: 3 }]); app.renderer.update(0.12);
    app.pause(); app.overlay.innerHTML = ''; app.overlay.className = 'overlay empty'; app.hud();
  });
  check(await page.evaluate(() => window.depthchain.sim.buffs.shield > 0 && window.depthchain.sim.pickups.length === 1), 'surface pickup grants shield and consumes only collected item');
  check(await page.locator('#buff-status').textContent().then(t => t.includes('水雷加速') && t.includes('强化水雷') && t.includes('舰船护盾')), 'all active buffs show remaining seconds');
  await page.screenshot({ path: 'output/playwright/mobile-enhanced-combat.png' });
  const snapshot = await page.evaluate(() => JSON.stringify(window.depthchain.sim.snapshot()));
  await page.evaluate(() => { const a = window.depthchain; a.renderer.draw(a.sim, 0.25); a.renderer.draw(a.sim, 0.75); });
  check(await page.evaluate(before => JSON.stringify(window.depthchain.sim.snapshot()) === before, snapshot), 'rendering does not move hitboxes or mutate simulation');
  await page.evaluate(() => { const a = window.depthchain; a.renderer.lowFx = true; a.renderer.draw(a.sim); });
  await page.screenshot({ path: 'output/playwright/mobile-enhanced-low-fx.png' });
  await page.evaluate(() => { const a = window.depthchain; a.renderer.lowFx = false; a.renderer.consume([{ id: 901, type: 'damage', x: a.sim.player.x, y: a.sim.player.y }]); a.renderer.update(0.08); });
  check(await page.evaluate(() => window.depthchain.renderer.hitPulse > 0 && window.depthchain.renderer.particles.some(p => p.smoke)), 'ship hit produces local flash, smoke and shake pulse');
  await page.screenshot({ path: 'output/playwright/mobile-ship-hit.png' });
  await page.evaluate(() => { const a = window.depthchain; a.renderer.clearEffects(); a.renderer.consume([{ id: 902, type: 'shield-hit', x: a.sim.player.x, y: a.sim.player.y }]); a.renderer.update(0.06); });
  check(await page.evaluate(() => window.depthchain.renderer.shieldPulse > 0 && window.depthchain.renderer.hitPulse === 0), 'shield absorption uses distinct ripple without damage shake');

  // Enlarged design specimens use the same drawing methods as gameplay.
  await page.evaluate(() => {
    const a = window.depthchain, canvas = document.createElement('canvas'); canvas.id = 'weapon-study'; canvas.width = 880; canvas.height = 440;
    canvas.style.cssText = 'position:fixed;top:0;left:0;z-index:99;width:880px;height:440px'; document.body.appendChild(canvas);
    const c = canvas.getContext('2d'), old = a.renderer.ctx; a.renderer.ctx = c;
    c.fillStyle = '#10394c'; c.fillRect(0, 0, 880, 440); c.fillStyle = '#e5e4cf'; c.font = '20px sans-serif'; c.fillText('水雷：入水 → 摇摆下沉 → 强化', 30, 36); c.fillText('鱼雷：直线推进 / 限速追踪', 480, 36);
    for (let i = 0; i < 3; i++) { c.save(); c.translate(95 + i * 145, 180); c.scale(4, 4); a.renderer.depthCharge({ id: 12, x: 0, y: 0, age: [0.12, 0.44, 0.8][i], power: i === 2 ? 1.35 : 1 }); c.restore(); }
    for (let i = 0; i < 2; i++) { c.save(); c.translate(560 + i * 190, 150); c.scale(4, 4); a.renderer.torpedo({ id: 8 + i, x: 0, y: 0, vx: i ? -55 : 0, speed: 235, homing: Boolean(i) }); c.restore(); }
    a.renderer.ctx = old;
  });
  await page.locator('#weapon-study').screenshot({ path: 'output/playwright/weapon-motion-study.png' });
  await page.evaluate(() => document.querySelector('#weapon-study').remove());

  await page.evaluate(() => {
    const a = window.depthchain; a.launch(63); const s = a.sim; s.status = 'playing'; s.spawned = s.waves[0].count;
    s.waveStats = { shots: 3, kills: 6, points: 1000 }; s.shots = 3; s.kills = 6; s.score = 1000;
    s.step(1/60); a.hud();
  });
  await page.waitForFunction(() => window.depthchain.sim.status === 'waveclear');
  check(await page.locator('#wave-notice').textContent().then(t => t.includes('3 颗雷炸了 6 艘') && t.includes('+250')), 'wave clear reports shots, kills and actual efficiency reward');
  await page.screenshot({ path: 'output/playwright/mobile-wave-reward.png' });
  await page.evaluate(() => { const a = window.depthchain; a.sim.end('验收场景'); a.finish(); });
  await page.getByRole('button', { name: '看看每波战报' }).click();
  check(await page.locator('.wave-report').textContent().then(t => t.includes('3 雷 / 6 艘') && t.includes('+250')), 'final report preserves per-wave totals');
  await page.screenshot({ path: 'output/playwright/mobile-wave-report.png' });
  await page.getByRole('button', { name: '回去看成绩' }).click();
  await page.getByRole('button', { name: '再炸一波' }).click();
  check(await page.evaluate(() => window.depthchain.sim.pickups.length === 0 && Object.values(window.depthchain.sim.buffs).every(v => v === 0) && window.depthchain.sim.waveResults.length === 0), 'new run resets drops, timers and wave reports');
  await page.evaluate(() => window.depthchain.home());
  check(errors.length === 0, 'no page errors in enhanced effects and music');
  return { passed: checks.length, checks };
}
