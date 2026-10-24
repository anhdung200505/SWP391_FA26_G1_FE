import { readSession, clearSession } from '../auth/session';
import { notifyDataChanged } from './dataChanged';

// Hàm gửi request dùng chung
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

// =========================================================================
// 1. LỄ TÂN & QUẢN TRỊ XEM DANH SÁCH ĐƠN HỖ TRỢ / TƯ VẤN
// =========================================================================

/**
 * 1. Lễ tân xem danh sách đơn tư vấn ghi danh (Khách chưa đăng ký tài khoản)
 * GET /api/support-requests/enrollment
 */
export function getEnrollmentConsultations() {
  return request('/support-requests/enrollment', { method: 'GET' });
}

/**
 * 2. Lễ tân xem các đơn Support Request của Học viên (Tạo qua POST /api/support-requests)
 * GET /api/support-requests/service
 */
export function getServiceSupportRequests() {
  return request('/support-requests/service', { method: 'GET' });
}

/**
 * 3. Xem toàn bộ các yêu cầu của 1 học viên cụ thể theo memberUserId
 * GET /api/support-requests/members/{memberUserId}
 */
export function getSupportRequestsByMemberId(memberUserId) {
  return request(`/support-requests/members/${memberUserId}`, { method: 'GET' });
}

/**
 * 4. Quản trị trung tâm xem yêu cầu Lễ tân đã chuyển lên (Chỉ đơn leo thang & đã quyết định)
 * GET /api/support-requests/financial
 */
export function getFinancialSupportRequests() {
  return request('/support-requests/financial', { method: 'GET' });
}

// =========================================================================
// 2. LỄ TÂN XỬ LÝ & PHÂN LOẠI YÊU CẦU
// =========================================================================

/**
 * 5. Lễ tân chỉnh sửa hoặc giải quyết đơn tư vấn khách hàng
 * PUT /api/support-requests/enrollment/{requestId}
 * Payload mẫu: { title, fullName, phone, email, sports, age, note, resolutionNote }
 */
export function updateEnrollmentConsultation(requestId, payload) {
  return request(`/support-requests/enrollment/${requestId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * 6. Lễ tân phân loại yêu cầu support của học viên
 * POST /api/support-requests/{requestId}/classify
 * Payload: { category: "account_issue" | "consultation" }
 */
export function classifySupportRequest(requestId, category) {
  return request(`/support-requests/${requestId}/handle`, {
    method: 'POST',
    body: JSON.stringify({ action: 'classify', category }),
  });
}

export function resolveMemberSupport(requestId, note) {
  return request(`/support-requests/${requestId}/handle`, {
    method: 'POST',
    body: JSON.stringify({ action: 'resolve', note }),
  });
}

/**
 * POST /api/support-requests/{requestId}/resolve-account
 * Payload: { note: "Nội dung giải quyết..." }
 */
export function resolveAccountIssue(requestId, note) {
  return request(`/support-requests/${requestId}/handle`, {
    method: 'POST',
    body: JSON.stringify({ action: 'resolve', category: 'account_issue', note }),
  });
}

/**
 * 8. Lễ tân giải đáp tư vấn cho học viên (Gửi email tự động cho học viên)
 * POST /api/support-requests/{requestId}/provide-consultation
 * Payload: { note: "Nội dung tư vấn..." }
 */
export function provideConsultation(requestId, note) {
  return request(`/support-requests/${requestId}/handle`, {
    method: 'POST',
    body: JSON.stringify({ action: 'resolve', category: 'consultation', note }),
  });
}

/**
 * 9. Lễ tân chuyển yêu cầu vượt thẩm quyền lên Quản trị trung tâm
 * POST /api/support-requests/{requestId}/escalate
 * Payload: { reason: "Lý do vượt phạm vi..." }
 */
export function escalateSupportRequest(requestId, reason) {
  return request(`/support-requests/${requestId}/handle`, {
    method: 'POST',
    body: JSON.stringify({ action: 'escalate', note: reason }),
  });
}

// =========================================================================
// 3. QUẢN TRỊ TRUNG TÂM PHÊ DUYỆT (ADMIN DECISION)
// =========================================================================

/**
 * 10. Quản trị trung tâm phê duyệt / từ chối yêu cầu do Lễ tân chuyển lên
 * POST /api/support-requests/{requestId}/decision
 * Payload: { decision: "approved" | "rejected", note: "Lý do / Ghi chú..." }
 */
export function submitAdminDecision(requestId, decision, note = '') {
  return request(`/support-requests/${requestId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision, note }),
  });
}