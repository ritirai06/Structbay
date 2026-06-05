const PERMISSIONS = {
  READ_OWN_PROFILE:          'read:own_profile',
  UPDATE_OWN_PROFILE:        'update:own_profile',
  DELETE_OWN_ACCOUNT:        'delete:own_account',
  CHANGE_OWN_PASSWORD:       'change:own_password',
  READ_ALL_USERS:            'read:all_users',
  UPDATE_USER_STATUS:        'update:user_status',
  DELETE_USER:               'delete:user',
  READ_ALL_VENDORS:          'read:all_vendors',
  APPROVE_VENDOR:            'approve:vendor',
  REJECT_VENDOR:             'reject:vendor',
  READ_ALL_SESSIONS:         'read:all_sessions',
  ACCESS_VENDOR_DASHBOARD:   'access:vendor_dashboard',
  MANAGE_OWN_PRODUCTS:       'manage:own_products',
  ACCESS_CUSTOMER_DASHBOARD: 'access:customer_dashboard',
  PLACE_ORDER:               'place:order',
  READ_PRODUCTS:             'read:products',
};

const ROLE_PERMISSIONS = {
  ADMIN: Object.values(PERMISSIONS),

  VENDOR: [
    PERMISSIONS.READ_OWN_PROFILE,
    PERMISSIONS.UPDATE_OWN_PROFILE,
    PERMISSIONS.DELETE_OWN_ACCOUNT,
    PERMISSIONS.CHANGE_OWN_PASSWORD,
    PERMISSIONS.ACCESS_VENDOR_DASHBOARD,
    PERMISSIONS.MANAGE_OWN_PRODUCTS,
    PERMISSIONS.READ_PRODUCTS,
  ],

  CUSTOMER: [
    PERMISSIONS.READ_OWN_PROFILE,
    PERMISSIONS.UPDATE_OWN_PROFILE,
    PERMISSIONS.DELETE_OWN_ACCOUNT,
    PERMISSIONS.CHANGE_OWN_PASSWORD,
    PERMISSIONS.ACCESS_CUSTOMER_DASHBOARD,
    PERMISSIONS.PLACE_ORDER,
    PERMISSIONS.READ_PRODUCTS,
  ],
};

const getPermissionsForRole = (role) => ROLE_PERMISSIONS[role] || [];
const roleHasPermission = (role, permission) => (ROLE_PERMISSIONS[role] || []).includes(permission);

module.exports = { PERMISSIONS, ROLE_PERMISSIONS, getPermissionsForRole, roleHasPermission };
