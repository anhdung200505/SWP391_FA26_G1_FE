
import { clearSession, readSession } from '../auth/session';

// ============================================
// API CONFIGURATION
// ============================================

// Local: sử dụng Vite Proxy.
// Production: gọi API trên Fly theo VITE_API_BASE_URL trong .env.production.
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/+$/, '');

// ============================================
// COMMON API REQUEST
// ============================================

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
  } catch (error) {
    console.error('Course Material API error:', error);

    throw new Error(
      'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng.'
    );
  }

  if (response.status === 401) {
    clearSession();
    throw new Error(
      'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.'
    );
  }

  if (!response.ok) {
    let message = 'Không tải được giáo trình.';

    try {
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const body = await response.json();

        message =
          body.message ||
          body.title ||
          body.error ||
          message;
      } else {
        message = `Máy chủ phản hồi lỗi HTTP ${response.status}.`;
      }
    } catch {
      message = `Máy chủ phản hồi lỗi HTTP ${response.status}.`;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// ============================================
// COURSE MATERIAL API
// ============================================

// Lấy danh sách giáo trình
export function listCourseMaterials() {
  return request('/course-materials');
}

// ============================================
// DOWNLOAD COURSE MATERIAL PDF
// ============================================

export async function downloadCourseMaterialPdf(sportId, sportName) {
  const token = readSession()?.token || localStorage.getItem('token');

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/course-materials/${encodeURIComponent(sportId)}/pdf`,
      {
        headers: {
          accept: 'application/pdf',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
  } catch (error) {
    console.error('Download course material error:', error);

    throw new Error(
      'Không thể kết nối đến máy chủ để tải PDF.'
    );
  }

  if (response.status === 401) {
    clearSession();
    throw new Error(
      'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.'
    );
  }

  if (!response.ok) {
    throw new Error(
      `Không tải được file PDF (HTTP ${response.status}).`
    );
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

// ============================================
// UPDATE COURSE MATERIAL
// ============================================

export function saveCourseMaterial(sportId, payload) {
  return request(
    `/course-materials/${encodeURIComponent(sportId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}
