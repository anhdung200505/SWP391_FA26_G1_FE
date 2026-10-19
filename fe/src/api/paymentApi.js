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

export function getSports(centerId) {
  return request(`/catalog/centers/${encodeURIComponent(centerId)}/sports`);
}

export function getClasses(centerId, sportId) {
  const query = new URLSearchParams({ centerId });
  if (sportId) query.set('sportId', sportId);
  return request(`/catalog/classes?${query.toString()}`);
}

export const registrationDraftKey = 'anhduy-registration';

export function saveRegistrationDraft(draft) {
  sessionStorage.setItem(registrationDraftKey, JSON.stringify(draft));
}

export function readRegistrationDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(registrationDraftKey) || 'null');
  } catch {
    return null;
  }
}

export function createPayOsPayment(payload) {
  return request('/payments/payos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPayment(paymentId) {
  return request(`/payments/${paymentId}`);
}
