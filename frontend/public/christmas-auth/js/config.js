/* CẤU HÌNH
 * Sửa các giá trị bên dưới rồi tải lại trang để áp dụng.
 * Bật/tắt dùng true / false (không đặt trong dấu nháy).
 */
window.OKLOGIN_CONFIG = {
  music: {
    enabled: true,       // Hiện nút nhạc; false = tắt toàn bộ trình phát.
    autoplay: true,      // Tự phát khi vào trang (trình duyệt có thể chặn).
    loop: false,         // true = phát lặp lại khi hết bài.
    volume: 0.5,         // 0–1; 0.5 = 50%.
    visualizer: true     // Hiện và chạy sóng nhạc.
  },
  effects: {
    courtyardChildren: true, // Các bé chạy/chơi tuyết ngoài sân.
    kitten: true,            // Mèo trên bệ cửa sổ.
    windowVisitors: true     // Các bé ngoi lên nhìn qua kính.
  },
  snow: {
    enabled: true,
    dayDensity: 1,       // 0–5; 0 = không tuyết, 1 = mức ngày hiện tại.
    nightDensity: 2.3,   // Cùng thang đo; có thể ít hơn ban ngày.
    daySpeed: 1,         // 0–5; tốc độ rơi ban ngày.
    nightSpeed: 1.8      // 0–5; tốc độ rơi ban đêm.
  },
  lights: {
    frame: true,        // Dây đèn quanh form và dưới header mobile.
    popups: true,       // Dây đèn quanh các popup.
    tree: true,         // Hiệu ứng đèn cây trong tranh ban đêm.
    twinkle: true       // false = đèn sáng tĩnh, không nhấp nháy.
  },
  ui: {
    initialMode: 'login', // 'login' = ngày; 'register' = đêm, theo bố cục hiện có.
    slideDurationMs: 1500 // 100–5000 ms; thời gian trượt đăng nhập/đăng ký.
  },
  feedback: {
    loadingMs: 2000,     // 0–30000 ms; thời gian chờ (không gồm hiệu ứng đóng popup).
    errorMessage: 'Sai email hoặc mật khẩu, vui lòng thử lại'
  },
  motion: {
    popupEnterMs: 600,  // 0–3000 ms; zoom/fade mở popup.
    popupExitMs: 500,   // 0–3000 ms; zoom/fade đóng popup.
    pauseBackgroundOnPopup: true // Giảm tải bằng cách tạm dừng cảnh sau popup.
  }
};

// Phần đọc cấu hình bên dưới không cần chỉnh sửa.
// Chuẩn hoá giá trị: giữ mặc định nếu bỏ mục hoặc nhập sai kiểu dữ liệu.
(() => {
  'use strict';
  const c = window.OKLOGIN_CONFIG || {};
  const music = c.music || {}, effects = c.effects || {}, snow = c.snow || {};
  const lights = c.lights || {}, ui = c.ui || {}, feedback = c.feedback || {}, motion = c.motion || {};
  const bool = (value, fallback) => typeof value === 'boolean' ? value : fallback;
  const number = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value)) : fallback;
  window.OKLOGIN_SETTINGS = {
    music: {
      enabled: bool(music.enabled, true), autoplay: bool(music.autoplay, true),
      loop: bool(music.loop, false), volume: number(music.volume, .5, 0, 1),
      visualizer: bool(music.visualizer, true)
    },
    effects: {
      courtyardChildren: bool(effects.courtyardChildren, true),
      kitten: bool(effects.kitten, true), windowVisitors: bool(effects.windowVisitors, true)
    },
    snow: {
      enabled: bool(snow.enabled, true), dayDensity: number(snow.dayDensity, 1, 0, 5),
      nightDensity: number(snow.nightDensity, 2.3, 0, 5),
      daySpeed: number(snow.daySpeed, 1, 0, 5), nightSpeed: number(snow.nightSpeed, 1.8, 0, 5)
    },
    lights: {
      frame: bool(lights.frame, true), popups: bool(lights.popups, true),
      tree: bool(lights.tree, true), twinkle: bool(lights.twinkle, true)
    },
    ui: {
      initialMode: ui.initialMode === 'register' ? 'register' : 'login',
      slideDurationMs: number(ui.slideDurationMs, 1500, 100, 5000)
    },
    feedback: {
      loadingMs: number(feedback.loadingMs, 2000, 0, 30000),
      errorMessage: typeof feedback.errorMessage === 'string' && feedback.errorMessage.trim()
        ? feedback.errorMessage : 'Sai email hoặc mật khẩu, vui lòng thử lại'
    },
    motion: {
      popupEnterMs: number(motion.popupEnterMs, 600, 0, 3000),
      popupExitMs: number(motion.popupExitMs, 500, 0, 3000),
      pauseBackgroundOnPopup: bool(motion.pauseBackgroundOnPopup, true)
    }
  };
})();
