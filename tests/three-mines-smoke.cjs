async(page)=>{
 await page.goto('http://127.0.0.1:4173/?practice=8');await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>window.depthchain&&window.depthchain.profile);
 await page.locator('[data-action=start]').click();if(await page.locator('[data-action=launch]').isVisible())await page.locator('[data-action=launch]').click();
 await page.waitForFunction(()=>window.depthchain.sim.status==='playing');
 const button=await page.locator('[data-control=fire]').boundingBox();await page.mouse.move(button.x+button.width/2,button.y+button.height/2);await page.mouse.down();
 await page.waitForFunction(()=>window.depthchain.sim.bombs.length===3);
 const shots=await page.evaluate(()=>window.depthchain.sim.shots);await page.waitForTimeout(350);
 if(await page.evaluate(()=>window.depthchain.sim.bombs.length>3)||await page.evaluate(()=>window.depthchain.sim.shots)!==shots)throw Error('three-slot limit failed');
 if((await page.locator('#ammo').innerText()).split(' ').length!==3||!(await page.locator('#status-text').innerText()).includes('三颗'))throw Error('HUD incorrect');
 await page.mouse.up();return {passed:3,scope:'desktop browser engineering check: held fire limit, three-slot HUD and full-ammo hint'};
}
