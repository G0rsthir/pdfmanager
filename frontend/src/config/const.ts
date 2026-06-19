export const AccessScopeEnum = {
  ADMIN_READ: "admin:read",
  ADMIN_WRITE: "admin:write",
  USER_READ: "user:read",
  USER_WRITE: "user:write",
} as const;

export type AccessScope =
  (typeof AccessScopeEnum)[keyof typeof AccessScopeEnum];
