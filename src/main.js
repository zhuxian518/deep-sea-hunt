import { AppController } from './app/AppController.js';
try {
  const app = new AppController();
  app.boot().catch(() => { document.getElementById('overlay').innerHTML = '<div class="panel fatal">没能打开游戏，关掉重进试试。</div>'; });
  // Opt-in local diagnostics only. The release build removes this branch.
  if (__DEV__) window.depthchain = app;
} catch (error) {
  document.getElementById('overlay').innerHTML = '<div class="panel fatal">画面没加载出来，关掉重进试试。</div>';
}
