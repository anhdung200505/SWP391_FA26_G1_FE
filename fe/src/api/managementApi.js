async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error('Không kết nối được máy chủ quản lý. Hãy chạy API tại http://localhost:5080.');
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

export function getDashboard() {
  return request('/management/dashboard');
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
