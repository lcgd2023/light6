export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // 处理 API 请求
    if (url.pathname.startsWith('/api/')) {
      return env.WORKER.fetch(request);
    }
    
    // 处理静态资源请求
    return env.ASSETS.fetch(request);
  }
}; 