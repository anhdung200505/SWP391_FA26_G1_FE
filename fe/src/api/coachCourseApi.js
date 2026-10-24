import { clearSession, readSession } from '../auth/session';

async function request(path, options = {}) {
  const { headers, ...rest } = options;
  const token = readSession()?.token || localStorage.getItem('token');

  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
    });
  } catch {
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

  if (response.status === 204) return null;
  return response.json();
}

const classPath = (classId, suffix = '') => `/coach/classes/${encodeURIComponent(classId)}${suffix}`;

export function listCoachClasses() {
  return request('/coach/classes');
}

export function getCoachClass(classId) {
  return request(classPath(classId));
}

export function getAttendance(classId, sessionId) {
  return request(classPath(classId, `/sessions/${encodeURIComponent(sessionId)}/attendance`));
}

export function saveAttendance(classId, sessionId, marks) {
  return request(classPath(classId, `/sessions/${encodeURIComponent(sessionId)}/attendance`), {
    method: 'PUT',
    body: JSON.stringify({ marks }),
  });
}

export function getEvaluations(classId) {
  return request(classPath(classId, '/evaluations'));
}

export function saveEvaluation(classId, payload) {
  return request(classPath(classId, '/evaluations'), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function getAssignments(classId) {
  return request(classPath(classId, '/assignments'));
}

export function createAssignment(classId, payload) {
  return request(classPath(classId, '/assignments'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAssignment(classId, assignmentId, payload) {
  return request(classPath(classId, `/assignments/${encodeURIComponent(assignmentId)}`), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteAssignment(classId, assignmentId) {
  return request(classPath(classId, `/assignments/${encodeURIComponent(assignmentId)}`), {
    method: 'DELETE',
  });
}

export function getCourseAi(classId) {
  return request(classPath(classId, '/ai'));
}

export function generateCourseAi(classId, brief) {
  return request(classPath(classId, '/ai/generate'), {
    method: 'POST',
    body: JSON.stringify({ brief }),
  });
}

export function regenerateCourseAi(classId, brief, changes) {
  return request(classPath(classId, '/ai/regenerate'), {
    method: 'POST',
    body: JSON.stringify({ brief, changes }),
  });
}

export function saveCourseDraft(classId, payload) {
  return request(classPath(classId, '/ai/draft'), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function publishCourseAi(classId) {
  return request(classPath(classId, '/ai/publish'), { method: 'POST' });
}

export function discardCoursePreview(classId) {
  return request(classPath(classId, '/ai/preview'), { method: 'DELETE' });
}

export function getMemberCoursePlans() {
  return request('/members/course-plans');
}
