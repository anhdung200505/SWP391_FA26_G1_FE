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

export function loginStaff(email, password, portal = 'staff') {
  return request('/auth/login', {
    method: 'POST',
    anonymous: true,
    body: JSON.stringify({ email, password, portal }),
  });
}

export function loginMember(email, password, portal = 'member') {
  return request('/auth/member-login', {
    method: 'POST',
    anonymous: true,
    body: JSON.stringify({ email, password, portal }),
  });
}

export function registerGuest(payload) {
  return request('/auth/register', {
    method: 'POST',
    anonymous: true,
    body: JSON.stringify(payload),
  });
}

export function sendRegisterOtp(payload) {
  return request('/auth/register/otp', {
    method: 'POST',
    anonymous: true,
    body: JSON.stringify(payload),
  });
}

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
// API ĐĂNG KÝ & THANH TOÁN (REGISTRATIONS & PAYMENTS)
// ==========================================

export function registerClass(payload) {
  return request('/class-registrations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getMyClassRegistrations() {
  return request('/class-registrations/mine');
}

export function getClassRegistrationStatus(paymentId) {
  return request(`/class-registrations/${paymentId}`);
}

export function payRegistration(payload) {
  return request('/registrations/pay', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// HÀM HỦY ĐƠN PENDING (GIÚP TẠO ĐƠN MỚI KHÔNG BỊ KHÓA TRÙNG)
export function cancelPayment(paymentId) {
  return request(`/payments/${paymentId}/cancel`, {
    method: 'POST',
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

// ==========================================
// API YÊU CẦU HỖ TRỢ & TƯ VẤN (SUPPORT REQUESTS)
// ==========================================

export function createEnrollmentConsultation(payload) {
  return request('/support-requests/enrollment', {
    method: 'POST',
    anonymous: true,
    body: JSON.stringify(payload),
  });
}

export function createSupportRequest(payload) {
  return request('/support-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ==========================================
// API QUẢN LÝ GÓI HỘI VIÊN & GIA HẠN PAYOS (MEMBERSHIP & RENEWALS)
// ==========================================

// 1. Lấy gói đang dùng, lịch sử & danh sách gói đang bán
export function getMemberMembership(memberUserId) {
  return request(`/members/${memberUserId}/membership`);
}

// 2. Lấy hotline tư vấn chăm sóc khách hàng
export function getConsultationContact(memberUserId) {
  return request(`/members/${memberUserId}/consultation-contact`);
}

// 3. Chọn gói & tạo liên kết/mã QR thanh toán PayOS
export function createMembershipRenewal(memberUserId, packageId) {
  return request(`/members/${memberUserId}/membership/renewals`, {
    method: 'POST',
    body: JSON.stringify({ packageId }),
  });
}

// 4. Kiểm tra & xác nhận cập nhật hạn gói sau khi thanh toán PayOS
export function confirmMembershipRenewal(memberUserId, paymentId) {
  return request(`/members/${memberUserId}/membership/renewals/${paymentId}/confirm`, {
    method: 'POST',
  });
}

// ==========================================
// API QUẢN TRỊ TRUNG TÂM XỬ LÝ ĐƠN HỖ TRỢ (ADMIN DECISION)
// ==========================================

// 1. Quản trị trung tâm lấy danh sách các yêu cầu Lễ tân chuyển lên
export function getEscalatedSupportRequests() {
  return request('/support-requests/financial');
}

// 2. Quản trị trung tâm ra quyết định phê duyệt (approved) hoặc từ chối (rejected)
export function processSupportRequestDecision(requestId, { decision, note }) {
  return request(`/support-requests/${requestId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision, note }),
  });
}

export function getMySupportRequests() {
  return request('/support-requests/mine');
}

// Lấy danh sách Huấn luyện viên theo bộ môn
export function getCoachesBySport(sportId) {
  return request(`/catalog/sports/${sportId}/coaches`);
}