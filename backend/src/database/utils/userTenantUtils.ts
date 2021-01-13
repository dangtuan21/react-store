/**
 * Check if user is in the tenant
 * @param {*} user
 * @param {*} tenant
 */
export function isUserInTenant(user, tenantId) {
  if (!user) {
    return false;
  }

  return user.tenants.some(
    (tenantUser) =>
      String(tenantUser.tenant.id) === String(tenantId),
  );
}
