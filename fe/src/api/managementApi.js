import { clearSession, readSession } from '../auth/session';

let onUnauthorized = () => {};

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(path, options = {}) {
  const { anonymous = false, headers, ...rest } = options;
  const token = anonymous ? '' : readSession()?.token;
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
    });
  } catch {
    throw new Error('Không kết nối được máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc API.');
  }

  if (response.status === 401 && !anonymous) {
    clearSession();
    onUnauthorized();
    throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  }

  if (!response.ok) {
    let message = 'Thao tác thất bại.';
    try {
      const body = await response.json();
      if (body.message) message = body.message;
    } catch {
      message = 'Máy chủ từ chối thao tác.';
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

// ==========================================
// API XÁC THỰC (AUTHENTICATION)
// ==========================================

// POST /api/auth/login - Đăng nhập Quản trị & Lễ tân
export function loginStaff(email, password, portal = 'staff') {
  return request('/auth/login', {
    method: 'POST',
    anonymous: true,
    body: JSON.stringify({ email, password, portal }),
  });
}

// POST /api/auth/member-login - Đăng nhập Học viên
export function loginMember(email, password, portal = 'member') {
  return request('/auth/member-login', {
    method: 'POST',
    anonymous: true,
    body: JSON.stringify({ email, password, portal }),
  });
}

// POST /api/auth/register - Đăng ký trực tiếp
export function registerGuest(payload) {
  return request('/auth/register', {
    method: 'POST',
    anonymous: true,
    body: JSON.stringify(payload),
  });
}

// POST /api/auth/register/otp - Gửi mã OTP đăng ký
export function sendRegisterOtp(payload) {
  return request('/auth/register/otp', {
    method: 'POST',
    anonymous: true,
    body: JSON.stringify(payload),
  });
}

// POST /api/auth/register/confirm - Xác nhận mã OTP đăng ký
export function confirmRegisterOtp(email, code) {
  return request('/auth/register/confirm', {
    method: 'POST',
    anonymous: true,
    body: JSON.stringify({ email, code }),
  });
}

// ==========================================
// API DANH MỤC & KHÓA HỌC (CATALOG)
// ==========================================

export function getCenters() {
  return request('/catalog/centers');
}

export function getSports(centerId = '1') {
  return request(`/catalog/centers/${centerId}/sports`);
}

// Alias bổ sung cho getSports để tương thích các component cũ/mới
export function getSportsByCenter(centerId = '1') {
  return getSports(centerId);
}

export function getClasses(centerId, sportId) {
  const params = new URLSearchParams();
  if (centerId) params.append('centerId', centerId);
  if (sportId) params.append('sportId', sportId);
  
  const queryString = params.toString();
  return request(`/catalog/classes${queryString ? `?${queryString}` : ''}`);
}

export function getClassDetail(classId) {
  return request(`/catalog/classes/${classId}`);
}

// ==========================================
// API ĐĂNG KÝ LỚP HỌC (CLASS REGISTRATIONS)
// ==========================================

// POST /api/class-registrations - Học viên đăng ký lớp học
export function registerClass(classId, extraInfo = {}) {
  return request('/class-registrations', {
    method: 'POST',
    body: JSON.stringify({
      classId,
      ...extraInfo,
    }),
  });
}

// GET /api/class-registrations/{paymentId} - Xem trạng thái đơn đăng ký
export function getClassRegistrationStatus(paymentId) {
  return request(`/class-registrations/${paymentId}`);
}

export function payRegistration(payload) {
  return request('/registrations/pay', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ==========================================
// API QUẢN LÝ (MANAGEMENT & USERS)
// ==========================================

export function createStaffAccount(payload) {
  return request('/user-accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getDashboard() {
  return request('/management/dashboard');
}

export function getUserAccounts(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/user-accounts${query ? `?${query}` : ''}`);
}

export function updateUserRole(userId, roleId) {
  return request(`/user-accounts/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ roleId }),
  });
}

export function updateAccountStatus(userId, status) {
  return request(`/user-accounts/${userId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// ==========================================
// API GÓI HỘI VIÊN (PACKAGES)
// ==========================================

export function getPackages() {
  return request('/packages');
}

export function createPackage(payload) {
  return request('/packages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePackageSetting(packageId, payload) {
  return request(`/packages/${packageId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ==========================================
// API HỒ SƠ CÁ NHÂN (MEMBERS PROFILE)
// ==========================================

export function getMemberProfile(memberUserId) {
  return request(`/members/${memberUserId}/profile`);
}

export function updateMemberProfile(memberUserId, payload) {
  return request(`/members/${memberUserId}/profile`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}