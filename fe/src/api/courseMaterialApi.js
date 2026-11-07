import { clearSession, readSession } from '../auth/session';

async function request(path, options = {}) {
  const token = readSession()?.token || localStorage.getItem('token');
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (response.status === 401) {
    clearSession();
    throw new Error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
  }
  if (!response.ok) {
    let message = 'Không tải được giáo trình.';
    try {
      const body = await response.json();
      if (body.message) message = body.message;
    } catch {
      message = 'Máy chủ phản hồi lỗi không xác định.';
    }
    throw new Error(message);
  }
  return response.json();
}

export function listCourseMaterials() {
  return request('/course-materials');
}

export async function downloadCourseMaterialPdf(sportId, sportName) {
  const token = readSession()?.token || localStorage.getItem('token');
  const response = await fetch(`/api/course-materials/${encodeURIComponent(sportId)}/pdf`, {
    headers: {
      accept: 'application/pdf',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (response.status === 401) {
    clearSession();
    throw new Error('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
  }
  if (!response.ok) {
    throw new Error('Không tải được file PDF.');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `giao-trinh-${sportName || sportId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function saveCourseMaterial(sportId, payload) {
  return request(`/course-materials/${encodeURIComponent(sportId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
