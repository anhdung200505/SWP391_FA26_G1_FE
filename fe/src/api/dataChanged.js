// Báo cho các chuông thông báo tải lại ngay sau một thao tác ghi dữ liệu (POST/PUT/DELETE...) thành công.
const EVENT = 'anhduy:data-changed';

export function notifyDataChanged(method) {
  if (method && method.toUpperCase() !== 'GET') {
    window.dispatchEvent(new Event(EVENT));
  }
}

// Trả hàm hủy đăng ký.
export function onDataChanged(callback) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
