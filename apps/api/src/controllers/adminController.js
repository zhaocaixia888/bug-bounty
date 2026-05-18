import { ok, fail } from "../utils/response.js";
import * as adminService from "../services/adminService.js";

// ── Metrics ─────────────────────────────────────────────────────────

export async function metrics(req, res) {
  return ok(res, await adminService.getAdminMetrics());
}

// ── User Management ─────────────────────────────────────────────────

export async function listUsers(req, res) {
  const { role, status, search, page, limit } = req.query;
  const result = await adminService.getUsers({ role, status, search, page, limit });
  return ok(res, result);
}

export async function getUserProfile(req, res) {
  try {
    const profile = await adminService.getUserProfile(req.params.userId);
    return ok(res, profile);
  } catch (e) {
    return fail(res, e.message, 404);
  }
}

export async function suspendUser(req, res) {
  try {
    const user = await adminService.suspendUser(req.params.userId, req.user.id);
    return ok(res, user);
  } catch (e) {
    return fail(res, e.message, 404);
  }
}

export async function reinstateUser(req, res) {
  try {
    const user = await adminService.reinstateUser(req.params.userId, req.user.id);
    return ok(res, user);
  } catch (e) {
    return fail(res, e.message, 404);
  }
}

export async function banUser(req, res) {
  try {
    const user = await adminService.banUser(req.params.userId, req.user.id);
    return ok(res, user);
  } catch (e) {
    return fail(res, e.message, 404);
  }
}

// ── Job Moderation ──────────────────────────────────────────────────

export async function listFlaggedJobs(req, res) {
  const { status } = req.query;
  return ok(res, await adminService.getFlaggedJobs({ status }));
}

export async function approveJob(req, res) {
  try {
    const job = await adminService.approveJob(req.params.jobId, req.user.id);
    return ok(res, job);
  } catch (e) {
    return fail(res, e.message, 404);
  }
}

export async function rejectJob(req, res) {
  try {
    const { reason } = req.body;
    const job = await adminService.rejectJob(req.params.jobId, req.user.id, reason);
    return ok(res, job);
  } catch (e) {
    return fail(res, e.message, 404);
  }
}

// ── Dispute Resolution ──────────────────────────────────────────────

export async function listDisputes(req, res) {
  const { status } = req.query;
  return ok(res, await adminService.getDisputes({ status }));
}

export async function getDisputeDetail(req, res) {
  try {
    const detail = await adminService.getDisputeDetail(req.params.disputeId);
    return ok(res, detail);
  } catch (e) {
    return fail(res, e.message, 404);
  }
}

export async function resolveDispute(req, res) {
  try {
    const { ruling } = req.body;
    const dispute = await adminService.resolveDispute(req.params.disputeId, req.user.id, ruling);
    return ok(res, dispute);
  } catch (e) {
    return fail(res, e.message, 404);
  }
}

// ── Platform Controls ───────────────────────────────────────────────

export async function getSettings(req, res) {
  return ok(res, await adminService.getPlatformSettings());
}

export async function updateSetting(req, res) {
  try {
    const { key, value } = req.body;
    const settings = await adminService.updatePlatformSetting(key, value, req.user.id);
    return ok(res, settings);
  } catch (e) {
    return fail(res, e.message, 400);
  }
}

// ── Audit Log ───────────────────────────────────────────────────────

export async function getAuditLogs(req, res) {
  const { action, adminId, from, to } = req.query;
  return ok(res, await adminService.getAuditLog({ action, adminId, from, to }));
}
