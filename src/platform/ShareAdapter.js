import { withTimeout } from './StorageAdapter.js';
export async function shareImage(environment, image, score) {
  const api = environment.xhs && environment.xhs.miniTool;
  if (!api || typeof api.postNote !== 'function') return { ok: false, message: '到小红书里打开，就能分享这张成绩卡了' };
  try {
    await withTimeout(api.postNote({ title: '我在深海较量炸了个高分', content: `炸潜艇拿了 ${score} 分，看看你能炸多少？`, mediaInfo: { image_resources: [{ url: image }] } }), 60000);
    return { ok: true, message: '去小红书看看笔记吧，是否发布成功以那里为准' };
  } catch (_) { return { ok: false, message: '这次没分享出去，成绩卡还在，再试一次也行' }; }
}
export async function saveImage(environment, image) {
  const api = environment.xhs && environment.xhs.miniTool;
  if (!api || typeof api.saveImageToPhotosAlbum !== 'function') return { ok: false, message: '到小红书里打开，就能存到相册了' };
  try {
    await withTimeout(api.saveImageToPhotosAlbum({ filePath: image }), 60000);
    return { ok: true, message: '存好了，去相册看看吧' };
  } catch (_) { return { ok: false, message: '没存下来，看看相册权限有没有开' }; }
}
