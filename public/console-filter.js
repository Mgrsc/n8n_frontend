(function() {
  'use strict';
  
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const filterPatterns = [
    /content_script\.js/i,
    /Failed to fetch/i,
    /chrome-extension:/i,
    /fetchError/i
  ];
  
  function shouldFilter(args) {
    const message = args.join(' ');
    return filterPatterns.some(pattern => pattern.test(message));
  }
  
  console.error = function(...args) {
    if (!shouldFilter(args)) {
      originalError.apply(console, args);
    } else {
      if (import.meta?.env?.DEV) {
        console.debug('🔇 已过滤浏览器扩展错误');
      }
    }
  };
  
  console.warn = function(...args) {
    if (!shouldFilter(args)) {
      originalWarn.apply(console, args);
    }
  };
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && typeof event.reason === 'object') {
      const message = event.reason.message || event.reason.toString();
      if (filterPatterns.some(pattern => pattern.test(message))) {
        event.preventDefault();
        if (import.meta?.env?.DEV) {
          console.debug('🔇 已过滤 Promise 错误:', message.substring(0, 50));
        }
      }
    }
  });
  
  console.info('✅ Console filter initialized - 控制台过滤器已启动');
})();
