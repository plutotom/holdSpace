export type AppRole = "admin" | "member";

/** Clerk org role → Convex users.role */
export function clerkOrgRoleToAppRole(clerkRole: string | null | undefined): AppRole {
  return clerkRole === "org:admin" ? "admin" : "member";
}

/** Convex users.role → Clerk org role */
export function appRoleToClerkOrgRole(role: AppRole): "org:admin" | "org:member" {
  return role === "admin" ? "org:admin" : "org:member";
}
