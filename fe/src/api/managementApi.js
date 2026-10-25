import { clearSession, readSession } from '../auth/session';
import { notifyDataChanged } from './dataChanged';

let onUnauthorized = () => {};

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(path, options = {}) {
  const { anonymous = false, headers, ...rest } = options;
  const token = anonymous ? '' : readSession()?.token || localStorage.getItem('token');
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

  notifyDataChanged(rest.method);
  if (response.status === 204) return null;
  return response.json();
}

// ==========================================
// API XÁC THỰC (AUTHENTICATION)
// ==========================================

export function changePassword(payload) {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

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

export function getCoachesBySport(sportId) {
  return request(`/catalog/sports/${sportId}/coaches`);
}

// ==========================================
// API QUẢN LÝ LỚP HỌC (ADMIN)
// ==========================================

function toQuery(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
  ).toString();
  return query ? `?${query}` : '';
}

// Mọi trạng thái lớp, kèm lịch tuần (schedule) và số buổi (sessionCount)
export function getManagementClasses(params = {}) {
  return request(`/management/classes${toQuery(params)}`);
}

export function getManagementCourses(sportId) {
  return request(`/management/courses${toQuery({ sportId })}`);
}

export function getManagementCoaches(sportId) {
  return request(`/management/coaches${toQuery({ sportId })}`);
}

export function getManagementRooms(sportId) {
  return request(`/management/rooms${toQuery({ sportId })}`);
}

export function getTimeSlots(kind = 'group') {
  return request(`/time-slots${toQuery({ kind })}`);
}

// { courseId, startDate, endDate, capacity, schedules: [{ weekday, timeSlotId }] } → số buổi, HLV/phòng kèm isBusy
export function checkClassAvailability(payload) {
  return request('/management/classes/availability', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createClass(payload) {
  return request('/management/classes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// { remainingSessions, firstSession, coaches: [{ id, name, isCurrent, isBusy, busyReason }] }
export function getClassCoachOptions(classId) {
  return request(`/management/classes/${classId}/coach-options`);
}

// Đổi HLV cho mọi buổi chưa diễn ra của lớp; học viên của lớp nhận thông báo. { coachUserId, note }
export function changeClassCoach(classId, payload) {
  return request(`/management/classes/${classId}/coach`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// Chỉ lớp canDelete = true (chưa ai đăng ký). Xóa cùng lịch tuần và buổi học. Trả null (204).
export function deleteClass(classId) {
  return request(`/management/classes/${classId}`, { method: 'DELETE' });
}

// ==========================================
// API LỊCH BUỔI HỌC (SESSIONS)
// ==========================================

// params: classId, sportId, from, to (yyyy-MM-dd). Mặc định từ hôm nay trở đi.
export function getSessions(params = {}) {
  return request(`/sessions${toQuery(params)}`);
}

// Học viên: lịch học của mình (kể cả buổi đã hủy), mỗi buổi kèm attendanceStatus: present | late | absent | null.
// params: from, to (yyyy-MM-dd). Mặc định từ hôm nay trở đi.
export function getMySessions(params = {}) {
  return request(`/sessions/mine${toQuery(params)}`);
}

// Học viên: lịch sử thanh toán (mua khóa học, mua/gia hạn/nâng hạng gói), mới nhất trước.
// { id, invoiceCode, kind: class | membership, title, amount, paymentMethod, status, createdAt, paidAt }
export function getMyPayments() {
  return request('/payments/mine');
}

// HLV và phòng có thể đổi cho buổi, kèm isBusy / busyReason
export function getSessionOptions(sessionId) {
  return request(`/sessions/${sessionId}/options`);
}

// Quản trị: { coachUserId?, roomId?, note? }
export function updateSession(sessionId, payload) {
  return request(`/sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// Lễ tân (và quản trị): { coachUserId, note? }
export function changeSessionCoach(sessionId, payload) {
  return request(`/sessions/${sessionId}/coach`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function cancelSession(sessionId, reason) {
  return request(`/sessions/${sessionId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ==========================================
// API HOẠT ĐỘNG CỦA LỄ TÂN & QUẢN TRỊ (chuông ở trang quản trị và portal lễ tân)
// ==========================================

// [{ id, actorUserId, actorName, actorRole, actorRoleLabel, action, entityName, entityId, detail, createdAt }], mới nhất trước.
// role: RECEPTIONIST | ADMIN, để trống lấy cả hai.
export function getStaffActivity({ role, limit = 60 } = {}) {
  return request(`/staff-activity${toQuery({ role, limit })}`);
}

// ==========================================
// API THÔNG BÁO CỦA TÔI (chuông ở header học viên)
// ==========================================

// { unreadCount, items: [{ id, title, content, isRead, createdAt }] }, mới nhất trước
export function getMyNotifications(limit = 30) {
  return request(`/notifications/mine?limit=${limit}`);
}

export function markNotificationRead(notificationId) {
  return request(`/notifications/${notificationId}/read`, { method: 'POST' });
}

export function markAllNotificationsRead() {
  return request('/notifications/read-all', { method: 'POST' });
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

// Đơn đang chờ thanh toán còn trong 3 phút (đăng ký lớp và mua gói), mới nhất lên đầu
export function getPendingCheckouts() {
  return request('/class-registrations/pending');
}

export function refreshClassCheckout(paymentId) {
  return request(`/class-registrations/${paymentId}/refresh`, { method: 'POST' });
}

export function payRegistration(payload) {
  return request('/registrations/pay', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Hủy đơn pending giúp tạo đơn mới không bị khóa trùng
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

export function getAiTokenUsage() {
  return request('/management/ai-token-usage');
}

export function updatePackageAiQuota(packageId, payload) {
  return request(`/management/packages/${encodeURIComponent(packageId)}/ai-quota`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
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

export function updateCoachSports(userId, sportIds) {
  return request(`/user-accounts/${userId}/sports`, {
    method: 'PUT',
    body: JSON.stringify({ sportIds }),
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

// Gửi ảnh đại diện dạng form-data (không dùng request() vì request() luôn đặt Content-Type JSON)
export async function uploadMemberAvatar(memberUserId, file) {
  const token = readSession()?.token || localStorage.getItem('token');
  const form = new FormData();
  form.append('file', file);

  let response;
  try {
    response = await fetch(`/api/members/${memberUserId}/profile/avatar`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
    });
  } catch {
    throw new Error('Không kết nối được máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc API.');
  }

  if (response.status === 401) {
    clearSession();
    onUnauthorized();
    throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || 'Tải ảnh đại diện thất bại.');
  }
  return body;
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

// Lấy danh sách đơn/yêu cầu hỗ trợ cá nhân của học viên
export function getMySupportRequests() {
  return request('/support-requests/mine');
}

// Quản trị trung tâm lấy danh sách các yêu cầu Lễ tân chuyển lên
export function getEscalatedSupportRequests() {
  return request('/support-requests/financial');
}

// Quản trị trung tâm ra quyết định phê duyệt (approved) hoặc từ chối (rejected)
export function processSupportRequestDecision(requestId, { decision, note }) {
  return request(`/support-requests/${requestId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision, note }),
  });
}

// ==========================================
// API QUẢN LÝ GÓI HỘI VIÊN & GIA HẠN PAYOS (MEMBERSHIP & RENEWALS)
// ==========================================

// Lấy gói đang dùng, lịch sử & danh sách gói đang bán
export function getMemberMembership(memberUserId) {
  return request(`/members/${memberUserId}/membership`);
}

// Lấy hotline tư vấn chăm sóc khách hàng
export function getConsultationContact(memberUserId) {
  return request(`/members/${memberUserId}/consultation-contact`);
}

// Chọn gói & tạo liên kết/mã QR thanh toán PayOS
export function createMembershipRenewal(memberUserId, packageId) {
  return request(`/members/${memberUserId}/membership/renewals`, {
    method: 'POST',
    body: JSON.stringify({ packageId }),
  });
}

// Kiểm tra & xác nhận cập nhật hạn gói sau khi thanh toán PayOS
export function confirmMembershipRenewal(memberUserId, paymentId) {
  return request(`/members/${memberUserId}/membership/renewals/${paymentId}/confirm`, {
    method: 'POST',
  });
}