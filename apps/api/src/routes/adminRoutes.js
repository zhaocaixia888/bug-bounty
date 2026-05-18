import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";
import * as adminCtrl from "../controllers/adminController.js";

export const adminRoutes = Router();

// All admin routes require auth + admin role
adminRoutes.use(authMiddleware);
adminRoutes.use(adminOnly);

// ── Dashboard / Metrics ─────────────────────────────────────────────
adminRoutes.get("/metrics", adminCtrl.metrics);

// ── User Management ─────────────────────────────────────────────────
adminRoutes.get("/users", adminCtrl.listUsers);
adminRoutes.get("/users/:userId", adminCtrl.getUserProfile);
adminRoutes.post("/users/:userId/suspend", adminCtrl.suspendUser);
adminRoutes.post("/users/:userId/reinstate", adminCtrl.reinstateUser);
adminRoutes.post("/users/:userId/ban", adminCtrl.banUser);

// ── Job Moderation ──────────────────────────────────────────────────
adminRoutes.get("/flagged-jobs", adminCtrl.listFlaggedJobs);
adminRoutes.post("/flagged-jobs/:jobId/approve", adminCtrl.approveJob);
adminRoutes.post("/flagged-jobs/:jobId/reject", adminCtrl.rejectJob);

// ── Dispute Resolution ──────────────────────────────────────────────
adminRoutes.get("/disputes", adminCtrl.listDisputes);
adminRoutes.get("/disputes/:disputeId", adminCtrl.getDisputeDetail);
adminRoutes.post("/disputes/:disputeId/resolve", adminCtrl.resolveDispute);

// ── Platform Controls ───────────────────────────────────────────────
adminRoutes.get("/settings", adminCtrl.getSettings);
adminRoutes.put("/settings", adminCtrl.updateSetting);

// ── Audit Log ───────────────────────────────────────────────────────
adminRoutes.get("/audit-log", adminCtrl.getAuditLogs);
