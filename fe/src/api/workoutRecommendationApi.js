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

const memberPath = (memberUserId, suffix = '') =>
  `/members/${encodeURIComponent(memberUserId)}/workout-recommendations${suffix}`;

export function getWorkoutAccess(memberUserId) {
  return request(memberPath(memberUserId, '/access'));
}

export function saveBodyMetrics(memberUserId, payload) {
  return request(memberPath(memberUserId, '/body'), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function submitWorkoutGoals(memberUserId, payload) {
  return request(memberPath(memberUserId, '/goals'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function decideWorkout(memberUserId, recommendationId, payload) {
  return request(memberPath(memberUserId, `/${encodeURIComponent(recommendationId)}/decision`), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function regenerateWorkout(memberUserId, payload) {
  return request(memberPath(memberUserId, '/regenerate'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getWorkoutRoutine(memberUserId) {
  return request(memberPath(memberUserId, '/routine'));
}

export function getCoachTrainingHistory(coachUserId) {
  return request(`/coaches/${encodeURIComponent(coachUserId)}/training-history`);
}

export function saveCoachTrainingHistory(coachUserId, payload) {
  return request(`/coaches/${encodeURIComponent(coachUserId)}/training-history`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
