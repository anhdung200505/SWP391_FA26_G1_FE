export function profileConfirmedKey(userId) {
  return `anhduy.profileConfirmed.${userId}`;
}

export function profileLaterKey(userId) {
  return `anhduy.profileNotice.later.${userId}`;
}

export function isProfileNoticeHidden(userId) {
  if (!userId) return true;
  if (localStorage.getItem(profileConfirmedKey(userId)) === '1') return true;
  return sessionStorage.getItem(profileLaterKey(userId)) === '1';
}

export function confirmProfileNotice(userId) {
  if (!userId) return;
  localStorage.setItem(profileConfirmedKey(userId), '1');
}

export function dismissProfileNoticeForSession(userId) {
  if (!userId) return;
  sessionStorage.setItem(profileLaterKey(userId), '1');
}

export function resetProfileNoticeSession(userId) {
  if (!userId) return;
  sessionStorage.removeItem(profileLaterKey(userId));
}
