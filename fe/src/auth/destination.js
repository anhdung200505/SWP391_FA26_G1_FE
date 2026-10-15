export function pathForRole(roleId) {
  if (roleId === 'ADMIN') return '/quan-ly';
  if (roleId === 'RECEPTIONIST' || roleId === 'COACH') return '/nhan-su';
  return '/home';
}
