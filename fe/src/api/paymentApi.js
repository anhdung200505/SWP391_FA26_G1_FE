async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: options.body,
    });
  } catch {
    throw new Error('Không kết nối được API. Hãy chạy backend tại http://localhost:5080.');
  }

  if (!response.ok) {
    let message = 'API từ chối thao tác.';
    try {
      const body = await response.json();
      if (body.message) message = body.message;
    } catch {
      message = 'API từ chối thao tác.';
    }
    throw new Error(message);
  }

  return response.json();
}

export function getCenters() {
  return request('/catalog/centers');
}

export function getClasses(centerId) {
  return request(`/catalog/classes?centerId=${encodeURIComponent(centerId)}`);
}

export function createPayOsPayment(memberUserId, classId) {
  return request('/payments/payos', {
    method: 'POST',
    body: JSON.stringify({ memberUserId, classId }),
  });
}

export function getPayment(paymentId) {
  return request(`/payments/${paymentId}`);
}
