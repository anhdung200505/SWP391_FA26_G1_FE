import { readSession, clearSession } from '../auth/session';
import { notifyDataChanged } from './dataChanged';

async function request(path, options = {}) {
  const { headers, ...rest } = options;
  const token = readSession()?.token || localStorage.getItem('token');

  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
    });
  } catch (err) {
    throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng.');
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

/**
 * 1. Đăng ký tài khoản nhanh cho Guest chưa có trong hệ thống
 * POST /api/auth/register
 */
export function registerGuestAccount(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * 2. Tra cứu học viên theo Email hoặc SĐT (10 số)
 * GET /api/reception/members/lookup?keyword=...
 */
export function lookupMember(keyword) {
  return request(`/reception/members/lookup?keyword=${encodeURIComponent(keyword)}`, {
    method: 'GET',
  });
}

/**
 * 3. Lễ tân đăng ký lớp giùm học viên (Tạo hóa đơn pending giữ chỗ 10 phút)
 * POST /api/reception/members/{memberUserId}/class-registrations
 */
export function createClassRegistrationForMember(memberUserId, payload) {
  return request(`/reception/members/${memberUserId}/class-registrations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * 4. Lễ tân xác nhận đã thu học phí tại quầy
 * POST /api/reception/class-registrations/{paymentId}/confirm-payment
 */
export function confirmRegistrationPayment(paymentId, paymentMethod) {
  return request(`/reception/class-registrations/${paymentId}/confirm-payment`, {
    method: 'POST',
    body: JSON.stringify({ paymentMethod }),
  });
}

export function getReceptionRegistrationStatus(paymentId) {
  return request(`/reception/class-registrations/${paymentId}`);
}

export function cancelReceptionRegistration(paymentId) {
  return request(`/reception/class-registrations/${paymentId}/cancel`, {
    method: 'POST',
  });
}

export function checkInMember(keyword) {
  return request('/reception/check-ins', {
    method: 'POST',
    body: JSON.stringify({ keyword }),
  });
}

/**
 * 5. Lễ tân xem danh sách học viên đã đăng ký
 * GET /api/reception/registrations
 */
export function getReceptionRegistrations(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/reception/registrations${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
}