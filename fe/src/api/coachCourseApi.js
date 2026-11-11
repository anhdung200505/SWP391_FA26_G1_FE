import { clearSession, readSession } from '../auth/session';

// ============================================
// API CONFIGURATION
// ============================================

// Local: sử dụng Vite proxy trong vite.config.js
// Production: gọi API trên Fly theo VITE_API_BASE_URL trong .env.production

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, options = {}) {
  const { headers, ...rest } = options;

  const token = readSession()?.token || localStorage.getItem('token');

  // Chuẩn hóa URL API
  const url = `${API_BASE_URL}/api${path}`;

  let response;

  try {
    response = await fetch(url, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...(headers || {}),
      },
    });
  } catch (error) {
    console.error('API connection error:', error);

    throw new Error(
      'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng.'
    );
  }

  // Xử lý hết hạn đăng nhập
  if (response.status === 401) {
    clearSession();

    throw new Error(
      'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.'
    );
  }

  // Xử lý lỗi từ Backend
  if (!response.ok) {
    let message = 'Thao tác thất bại.';

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
        const text = await response.text();

        console.error('Backend returned non-JSON response:', text);

        message = `Máy chủ phản hồi lỗi (${response.status}).`;
      }
    } catch (error) {
      console.error('Error reading API response:', error);

      message = `Máy chủ phản hồi lỗi (${response.status}).`;
    }

    throw new Error(message);
  }

  // API không trả dữ liệu
  if (response.status === 204) {
    return null;
  }

  // Kiểm tra response JSON
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const text = await response.text();

    console.error('Expected JSON but received:', text);

    throw new Error(
      'Backend không trả về dữ liệu JSON hợp lệ.'
    );
  }

  return response.json();
}

// ============================================
// COACH CLASS API
// ============================================

const classPath = (classId, suffix = '') =>
  `/coach/classes/${encodeURIComponent(classId)}${suffix}`;

// Lấy danh sách lớp của Coach
export function listCoachClasses() {
  return request('/coach/classes');
}

// Lấy thông tin chi tiết lớp
export function getCoachClass(classId) {
  return request(classPath(classId));
}

// ============================================
// ATTENDANCE API
// ============================================

// Lấy danh sách điểm danh
export function getAttendance(classId, sessionId) {
  return request(
    classPath(
      classId,
      `/sessions/${encodeURIComponent(sessionId)}/attendance`
    )
  );
}

// Lưu điểm danh
export function saveAttendance(classId, sessionId, marks) {
  return request(
    classPath(
      classId,
      `/sessions/${encodeURIComponent(sessionId)}/attendance`
    ),
    {
      method: 'PUT',
      body: JSON.stringify({ marks }),
    }
  );
}

// ============================================
// EVALUATION API
// ============================================

// Lấy đánh giá học viên
export function getEvaluations(classId) {
  return request(classPath(classId, '/evaluations'));
}

// Lưu đánh giá
export function saveEvaluation(classId, payload) {
  return request(
    classPath(classId, '/evaluations'),
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

// ============================================
// INTAKE API
// ============================================

// Lấy thông tin đầu vào
export function getIntake(classId) {
  return request(classPath(classId, '/intake'));
}

// Lưu thông tin đầu vào
export function saveIntake(classId, payload) {
  return request(
    classPath(classId, '/intake'),
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

// ============================================
// ASSIGNMENT API
// ============================================

// Lấy danh sách bài tập
export function getAssignments(classId) {
  return request(classPath(classId, '/assignments'));
}

// Tạo bài tập
export function createAssignment(classId, payload) {
  return request(
    classPath(classId, '/assignments'),
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

// Cập nhật bài tập
export function updateAssignment(classId, assignmentId, payload) {
  return request(
    classPath(
      classId,
      `/assignments/${encodeURIComponent(assignmentId)}`
    ),
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

// Xóa bài tập
export function deleteAssignment(classId, assignmentId) {
  return request(
    classPath(
      classId,
      `/assignments/${encodeURIComponent(assignmentId)}`
    ),
    {
      method: 'DELETE',
    }
  );
}

// ============================================
// COURSE AI API
// ============================================

// Lấy dữ liệu AI của khóa học
export function getCourseAi(classId) {
  return request(classPath(classId, '/ai'));
}

// Tạo nội dung AI
export function generateCourseAi(classId, brief, sessionId) {
  return request(
    classPath(classId, '/ai/generate'),
    {
      method: 'POST',
      body: JSON.stringify({
        brief,
        sessionId,
      }),
    }
  );
}

// Tạo lại nội dung AI
export function regenerateCourseAi(
  classId,
  brief,
  changes,
  sessionId
) {
  return request(
    classPath(classId, '/ai/regenerate'),
    {
      method: 'POST',
      body: JSON.stringify({
        brief,
        changes,
        sessionId,
      }),
    }
  );
}

// Lưu bản nháp AI
export function saveCourseDraft(classId, payload) {
  return request(
    classPath(classId, '/ai/draft'),
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

// Xuất bản nội dung AI
export function publishCourseAi(classId) {
  return request(
    classPath(classId, '/ai/publish'),
    {
      method: 'POST',
    }
  );
}

// Xóa bản xem trước AI
export function discardCoursePreview(classId) {
  return request(
    classPath(classId, '/ai/preview'),
    {
      method: 'DELETE',
    }
  );
}

// ============================================
// MEMBER COURSE API
// ============================================

// Lấy kế hoạch khóa học của học viên
export function getMemberCoursePlans() {
  return request('/members/course-plans');
}