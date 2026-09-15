export function landingPathForRole(role?: string | null) {
  return role === 'admin' ? '/admin' : '/home';
}
