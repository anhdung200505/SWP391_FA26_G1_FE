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
    throw new Error('Không kết nối được máy chủ quản lý. Hãy chạy API tại http://localhost:5080.');
  }

  if (response.status === 401 && !anonymous) {
    clearSession();
    onUnauthorized();
    throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  }

  if (!response.ok) {
    let message = 'Máy chủ quản lý từ chối thao tác.';
    try {
      const body = await response.json();
      if (body.message) message = body.message;
    } catch {
      message = 'Máy chủ quản lý từ chối thao tác.';
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function login(email, password, portal = 'staff') {
  return request('/auth/login', {
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

export function getCenters() {
  return request('/catalog/centers');
}

export function getSports(centerId) {
  return request(`/catalog/centers/${centerId}/sports`);
}

export function getClasses(centerId, sportId) {
  const query = new URLSearchParams({ centerId, sportId });
  return request(`/catalog/classes?${query}`);
}

export function getClassDetail(classId) {
  return request(`/catalog/classes/${classId}`);
}

export function payRegistration(payload) {
  return request('/registrations/pay', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

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

// BỔ SUNG EXPORT TẤT CẢ CÁC HÀM NÀY:
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

export function getMemberProfile(memberUserId) {
  return request(`/members/${memberUserId}/profile`);
}

export function updateMemberProfile(memberUserId, payload) {
  return request(`/members/${memberUserId}/profile`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}