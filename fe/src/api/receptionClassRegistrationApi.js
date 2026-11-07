import { readSession, clearSession } from '../auth/session';
import { notifyDataChanged } from './dataChanged';

// Backend URL lấy từ .env.production.
// Nếu biến môi trường trống, sử dụng Vite proxy khi chạy local.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

async function request(path, options = {}) {
  const { headers, ...rest } = options;
  const token = readSession()?.token || localStorage.getItem('token');

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
    });
  } catch (err) {
    throw new Error(
      'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng.',
    );
  }

  if (response.status === 401) {
    clearSession();
    throw new Error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
  }

  if (!response.ok) {
    let message = 'Thao tác thất bại.';

    try {
      const body = await response.json();
      if (body.message) message = body.message;
    } catch {
      message = 'Máy chủ phản hồi lỗi không xác định.';
    }

    throw new Error(message);
  }

  notifyDataChanged(rest.method);

  if (response.status === 204) return null;

  return response.json();
}

// ==========================================
// 1. ĐĂNG KÝ TÀI KHOẢN GUEST
// ==========================================

/**
 * Đăng ký tài khoản nhanh cho Guest chưa có trong hệ thống.
 * POST /api/auth/register
 */
export function registerGuestAccount(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ==========================================
// 2. TRA CỨU HỌC VIÊN
// ==========================================

/**
 * Lấy danh sách lớp bị chặn của học viên.
 * GET /api/reception/members/{memberUserId}/blocked-classes
 */
export function getMemberBlockedClasses(memberUserId) {
  return request(`/reception/members/${memberUserId}/blocked-classes`);
}

/**
 * Tra cứu học viên theo Email hoặc SĐT (10 số).
 * GET /api/reception/members/lookup?keyword=...
 */
export function lookupMember(keyword) {
  return request(
    `/reception/members/lookup?keyword=${encodeURIComponent(keyword)}`,
    {
      method: 'GET',
    },
  );
}

// ==========================================
// 3. LỄ TÂN ĐĂNG KÝ LỚP CHO HỌC VIÊN
// ==========================================

/**
 * Lễ tân đăng ký lớp giùm học viên.
 * Tạo hóa đơn pending giữ chỗ 10 phút.
 *
 * POST /api/reception/members/{memberUserId}/class-registrations
 */
export function createClassRegistrationForMember(memberUserId, payload) {
  return request(
    `/reception/members/${memberUserId}/class-registrations`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

// ==========================================
// 4. XÁC NHẬN THANH TOÁN ĐĂNG KÝ
// ==========================================

/**
 * Lễ tân xác nhận đã thu học phí tại quầy.
 * POST /api/reception/class-registrations/{paymentId}/confirm-payment
 */
export function confirmRegistrationPayment(paymentId, paymentMethod) {
  return request(
    `/reception/class-registrations/${paymentId}/confirm-payment`,
    {
      method: 'POST',
      body: JSON.stringify({ paymentMethod }),
    },
  );
}

/**
 * Lấy trạng thái đăng ký.
 * GET /api/reception/class-registrations/{paymentId}
 */
export function getReceptionRegistrationStatus(paymentId) {
  return request(`/reception/class-registrations/${paymentId}`);
}

/**
 * Hủy đăng ký lớp.
 * POST /api/reception/class-registrations/{paymentId}/cancel
 */
export function cancelReceptionRegistration(paymentId) {
  return request(
    `/reception/class-registrations/${paymentId}/cancel`,
    {
      method: 'POST',
    },
  );
}

// ==========================================
// 5. CHECK-IN / CHECK-OUT HỌC VIÊN
// ==========================================

// Check-in vào trung tâm (không gắn lớp, cần gói hội viên còn hạn).
// Trả { outcome: checked_in | already_inside | duplicate, checkIn, message }.

export function checkInMember(keyword) {
  return request('/reception/check-ins', {
    method: 'POST',
    body: JSON.stringify({ keyword }),
  });
}

/**
 * Check-out học viên.
 * POST /api/reception/check-ins/{checkInId}/check-out
 */
export function checkOutMember(checkInId) {
  return request(
    `/reception/check-ins/${checkInId}/check-out`,
    {
      method: 'POST',
    },
  );
}

/**
 * Lễ tân chỉ hoàn tác lượt trong ngày, quản trị mọi lúc.
 * reason bắt buộc.
 *
 * POST /api/reception/check-ins/{checkInId}/void
 */
export function voidCheckIn(checkInId, reason) {
  return request(
    `/reception/check-ins/${checkInId}/void`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );
}

/**
 * Lấy danh sách check-in của trung tâm.
 *
 * params:
 * - date: yyyy-MM-dd, mặc định hôm nay
 * - q
 * - status: '' | 'inside' | 'voided'
 *
 * Trả { date, summary, items }.
 *
 * GET /api/reception/check-ins
 */
export function getCenterCheckIns(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value),
  ).toString();

  return request(
    `/reception/check-ins${query ? `?${query}` : ''}`,
  );
}

// ==========================================
// 6. DANH SÁCH ĐĂNG KÝ CỦA HỌC VIÊN
// ==========================================

/**
 * Lễ tân xem danh sách học viên đã đăng ký.
 * GET /api/reception/registrations
 */
export function getReceptionRegistrations(params = {}) {
  const query = new URLSearchParams(params).toString();

  return request(
    `/reception/registrations${query ? `?${query}` : ''}`,
    {
      method: 'GET',
    },
  );
}