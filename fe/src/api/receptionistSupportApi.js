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

export function getEnrollmentConsultations() {
  return request('/support-requests/enrollment', { method: 'GET' });
}

export function getServiceSupportRequests() {
  return request('/support-requests/service', { method: 'GET' });
}

export function getSupportRequestsByMemberId(memberUserId) {
  return request(`/support-requests/members/${memberUserId}`, { method: 'GET' });
}

export function getFinancialSupportRequests() {
  return request('/support-requests/financial', { method: 'GET' });
}

// =========================================================================
// 2. LỄ TÂN XỬ LÝ & PHÂN LOẠI YÊU CẦU (SWAGGER SPEC /handle)
// =========================================================================

/**
 * Hàm chung gọi POST /api/support-requests/{requestId}/handle
 * payload: { action: "resolve" | "escalate" | "classify", note, category }
 */
export function handleSupportRequest(requestId, { action, note, category }) {
  return request(`/support-requests/${requestId}/handle`, {
    method: 'POST',
    body: JSON.stringify({ action, note, category }),
  });
}

export function updateEnrollmentConsultation(requestId, payload) {
  return request(`/support-requests/enrollment/${requestId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function classifySupportRequest(requestId, category) {
  return handleSupportRequest(requestId, { action: 'classify', category });
}

export function resolveMemberSupport(requestId, note) {
  return handleSupportRequest(requestId, { action: 'resolve', note });
}

export function resolveAccountIssue(requestId, note) {
  return handleSupportRequest(requestId, { action: 'resolve', category: 'account_issue', note });
}

export function provideConsultation(requestId, note) {
  return handleSupportRequest(requestId, { action: 'resolve', category: 'consultation', note });
}

export function escalateSupportRequest(requestId, reason) {
  return handleSupportRequest(requestId, { action: 'escalate', note: reason });
}

export function escalateEnrollmentConsultation(requestId, reason) {
  return request(`/support-requests/enrollment/${requestId}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// =========================================================================
// 3. QUẢN TRỊ TRUNG TÂM PHÊ DUYỆT (ADMIN DECISION)
// =========================================================================

export function submitAdminDecision(requestId, decision, note = '') {
  return request(`/support-requests/${requestId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision, note }),
  });
}

export function readSupportRequestType(reason) {
  const text = String(reason || '').replace(/\r/g, '');
  const line = text.split('\n').find((row) => row.startsWith('Loại:'));
  if (!line) {
    const older = text.match(/Học viên chọn loại\s+(.+?)\./);
    return older ? older[1].trim() : '';
  }
  return line.slice('Loại:'.length).trim();
}

export function readEscalationReason(reason) {
  const text = String(reason || '');
  const marker = 'Lễ tân chuyển lên vì ngoài phạm vi:';
  const index = text.indexOf(marker);
  return index >= 0 ? text.slice(index + marker.length).trim() : '';
}