/**
 * Admin-only middleware.
 * Verifies that the authenticated user has the admin role server-side.
 * Must be used AFTER authMiddleware (which populates req.user).
 */
import { fail } from "../utils/response.js";

export function adminOnly(req, res, next) {
  if (!req.user) {
    return fail(res, "Authentication required", 401);
  }
  if (req.user.role !== "admin") {
    return fail(res, "Admin access required", 403);
  }
  return next();
}
