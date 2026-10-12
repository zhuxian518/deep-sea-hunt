async (page) => {
  const checks = [], check = (condition, name) => { if (!condition) throw new Error(name); checks.push(name); };
  await page.waitForFunction(() => window.depthchain && window.depthchain.profile);
  await page.evaluate(() => { window.depthchain.home(); window.depthchain.launch(761); });
  for (const [width, height] of [[320,568],[360,640],[390,844],[430,932],[768,1024],[820,1180],[568,320],[844,390],[932,430],[1024,600]]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(h => document.documentElement.style.getPropertyValue('--viewport-height') === `${h}px`, height);
    const geometry = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('[data-control]')).map(el => { const b = el.getBoundingClientRect(); return { x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height }; });
      const sea = document.querySelector('#sea').getBoundingClientRect();
      return { buttons, seaHeight:sea.height, width:document.documentElement.scrollWidth };
    });
    check(geometry.width <= width && geometry.seaHeight >= 120 && geometry.buttons.every(b => b.x >= 0 && b.y >= 0 && b.right <= width && b.bottom <= height && b.width >= 44 && b.height >= 44), `visible usable controls ${width}x${height}`);
  }
  await page.setViewportSize({ width:390,height:844 });
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--viewport-height') === '844px');
  await page.evaluate(() => { if (window.depthchain.state !== 'game') window.depthchain.launch(761); });
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled',{ enabled:true,maxTouchPoints:2 });
  const left = await page.locator('[data-control=left]').boundingBox(), fire = await page.locator('[data-control=fire]').boundingBox();
  await client.send('Input.dispatchTouchEvent',{ type:'touchStart',touchPoints:[{x:left.x+left.width/2,y:left.y+left.height/2,id:1},{x:fire.x+fire.width/2,y:fire.y+fire.height/2,id:2}] });
  await page.waitForFunction(() => window.depthchain.input.sample().moveAxis === -1 && window.depthchain.input.sample().fireHeld);
  await page.evaluate(() => { window.__heldAt=Date.now(); });
  await page.waitForFunction(() => Date.now()-window.__heldAt >= 1600);
  check(await page.evaluate(() => !window.getSelection().toString() && window.depthchain.input.sample().moveAxis === -1 && window.depthchain.input.sample().fireHeld && !document.querySelector('[data-control=left] .direction-icon').textContent), 'long press real dual touch: no arrow text or selection, controls remain held');
  await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await page.waitForFunction(() => window.depthchain.input.pointers.size === 0);
  await client.detach();
  const fallback = await page.evaluate(() => {
    const descriptor = Object.getOwnPropertyDescriptor(window,'PointerEvent'), root=document.createElement('div');
    root.innerHTML='<button data-control="left">L</button><button data-control="fire">F</button>';
    root.style.cssText='position:fixed;left:0;top:0;z-index:10000'; document.body.appendChild(root);
    Object.defineProperty(window,'PointerEvent',{ configurable:true,value:undefined });
    let input;
    try { input=new window.depthchain.input.constructor(root,()=>{}); } finally { if(descriptor) Object.defineProperty(window,'PointerEvent',descriptor); else delete window.PointerEvent; }
    input.setEnabled(true);
    const touch=(identifier,el)=>{ const r=el.getBoundingClientRect(); return {identifier,clientX:r.x+r.width/2,clientY:r.y+r.height/2}; };
    const emit=(type,changes)=>{ const e=new Event(type,{bubbles:true,cancelable:true}); Object.defineProperty(e,'changedTouches',{value:changes}); root.dispatchEvent(e); return e.defaultPrevented; };
    const points=[touch(1,root.children[0]),touch(2,root.children[1])], blocked=emit('touchstart',points), held=input.sample(); emit('touchcancel',points); const released=input.sample(); input.setEnabled(false);root.remove();
    return {blocked,held,released};
  });
  check(fallback.blocked && fallback.held.moveAxis === -1 && fallback.held.fireHeld && fallback.released.moveAxis === 0 && !fallback.released.fireHeld,'TouchEvent fallback tested without PointerEvent');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  check(await page.evaluate(() => window.depthchain.input.pointers.size === 0 && window.depthchain.input.keys.size === 0),'pagehide releases controls');
  await page.evaluate(() => window.depthchain.home());
  return {passed:checks.length,checks,limits:['Chromium viewport/touch emulation; not iOS WebKit or HarmonyOS physical-device certification']};
}
