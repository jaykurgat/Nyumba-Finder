export const SUPERLANDLORD_EMAILS = new Set([
  'jaykurgat1@gmail.com',
  'jaykurgat@gmail.com',
]);

export function isSuperlandlord(user: { accessRole?: string | null } | null | undefined) {
  return user?.accessRole === 'SUPERLANDLORD';
}

