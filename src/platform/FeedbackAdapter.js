import { withTimeout } from './StorageAdapter.js';
export async function openFeedback(env, content) {
  const xhs = env.xhs, api = xhs && xhs.miniTool;
  let options = xhs && xhs.launchOptions;
  try {
    if (!(options && options.miniToolEnv && options.miniToolEnv.buildVersion) && api && typeof api.getLaunchOptions === 'function') options = await withTimeout(api.getLaunchOptions());
    const build = Number(options && options.miniToolEnv && options.miniToolEnv.buildVersion) || 0;
    if (Math.floor(build / 1000) < 9490 || !api || typeof api.interactionOpenApi !== 'function') return { ok: false, message: '请回到作者笔记留言，或点作者头像关注、私信。新版小红书支持直接带反馈草稿打开评论区。' };
    const result = await withTimeout(api.interactionOpenApi({ payload: { action: 'post_comment', content }, saveToAlbum: false }));
    return result && result.routed ? { ok: true, message: '已打开评论草稿，请检查后自行发布' } : { ok: false, message: '评论区暂时没打开，请回到作者笔记留言或私信' };
  } catch (_) { return { ok: false, message: '评论区暂时没打开，请回到作者笔记留言或私信' }; }
}
