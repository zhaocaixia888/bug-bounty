/**
 * Admin Service
 *
 * Handles all admin-level business logic: user management,
 * job moderation, dispute resolution, trust metrics, platform
 * controls, and audit logging.
 *
 * In production these would query the database via Prisma.
 * For now they use an in-memory store that mirrors the schema
 * and can be swapped for real DB calls without changing the API.
 */

// ── In-memory audit log (append-only) ───────────────────────────────
const auditLog = [];

function appendToAudit(action, adminId, details) {
  auditLog.push({
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    action,
    adminId,
    details,
    timestamp: new Date().toISOString(),
  });
}

// ── Mock data stores (swap with Prisma queries in production) ───────
let users = [
  { id: "u1", name: "Alice Freelancer", email: "alice@example.com", role: "freelancer", status: "active", joinDate: "2025-11-01", activeJobs: 3, disputeCount: 0 },
  { id: "u2", name: "Bob Client", email: "bob@example.com", role: "client", status: "active", joinDate: "2025-12-15", activeJobs: 0, disputeCount: 1 },
  { id: "u3", name: "Charlie Dev", email: "charlie@example.com", role: "freelancer", status: "suspended", joinDate: "2026-01-10", activeJobs: 0, disputeCount: 2 },
  { id: "u4", name: "Diana Designer", email: "diana@example.com", role: "freelancer", status: "active", joinDate: "2026-02-20", activeJobs: 5, disputeCount: 0 },
  { id: "u5", name: "Eve Client", email: "eve@example.com", role: "client", status: "flagged", joinDate: "2026-03-05", activeJobs: 0, disputeCount: 3 },
  { id: "admin1", name: "Admin User", email: "admin@freelanceflow.com", role: "admin", status: "active", joinDate: "2025-06-01", activeJobs: 0, disputeCount: 0 },
];

let flaggedJobs = [
  { id: "j1", title: "Suspicious Data Entry", postedBy: "eve@example.com", flaggedReason: "Automated rule: unusual pricing", status: "pending", createdAt: "2026-05-15" },
  { id: "j2", title: "Urgent: Build a Clone of Facebook", postedBy: "bob@example.com", flaggedReason: "User report: unrealistic scope", status: "pending", createdAt: "2026-05-16" },
  { id: "j3", title: "Write 1000 fake reviews", postedBy: "eve@example.com", flaggedReason: "Automated rule: policy violation", status: "pending", createdAt: "2026-05-17" },
];

let disputes = [
  { id: "d1", jobTitle: "E-commerce Website", freelancer: "Alice Freelancer", client: "Bob Client", status: "open", amount: 2500, createdAt: "2026-05-10", evidence: ["chat_log.txt", "delivery_screenshot.png"] },
  { id: "d2", jobTitle: "Logo Design", freelancer: "Diana Designer", client: "Eve Client", status: "under_review", amount: 500, createdAt: "2026-05-12", evidence: ["brief.pdf", "revisions.png"] },
];

let platformSettings = {
  registrationOpen: true,
  jobPostingOpen: true,
};

// ── Metrics ─────────────────────────────────────────────────────────

export async function getAdminMetrics() {
  return {
    totalUsers: users.length,
    activeFreelancers: users.filter(u => u.role === "freelancer" && u.status === "active").length,
    openJobs: 42,
    openDisputes: disputes.filter(d => d.status !== "resolved").length,
    flaggedListings: flaggedJobs.filter(j => j.status === "pending").length,
    monthlyVolume: 128900,
    trustScoreDistribution: {
      high: 65,
      medium: 25,
      low: 10,
    },
  };
}

// ── User Management ─────────────────────────────────────────────────

export async function getUsers(filters = {}) {
  let result = [...users];
  if (filters.role) result = result.filter(u => u.role === filters.role);
  if (filters.status) result = result.filter(u => u.status === filters.status);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }
  return { users: result, total: result.length };
}

export async function suspendUser(userId, adminId) {
  const user = users.find(u => u.id === userId);
  if (!user) throw new Error("User not found");
  user.status = "suspended";
  appendToAudit("user_suspend", adminId, { userId, userName: user.name });
  return user;
}

export async function reinstateUser(userId, adminId) {
  const user = users.find(u => u.id === userId);
  if (!user) throw new Error("User not found");
  user.status = "active";
  appendToAudit("user_reinstate", adminId, { userId, userName: user.name });
  return user;
}

export async function banUser(userId, adminId) {
  const user = users.find(u => u.id === userId);
  if (!user) throw new Error("User not found");
  user.status = "banned";
  appendToAudit("user_ban", adminId, { userId, userName: user.name });
  return user;
}

export async function getUserProfile(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) throw new Error("User not found");
  return {
    ...user,
    disputeHistory: disputes.filter(d => d.freelancer === user.name || d.client === user.name),
  };
}

// ── Job Moderation ──────────────────────────────────────────────────

export async function getFlaggedJobs(filters = {}) {
  let result = [...flaggedJobs];
  if (filters.status) result = result.filter(j => j.status === filters.status);
  return { jobs: result, total: result.length };
}

export async function approveJob(jobId, adminId) {
  const job = flaggedJobs.find(j => j.id === jobId);
  if (!job) throw new Error("Job not found");
  job.status = "approved";
  appendToAudit("job_approve", adminId, { jobId, jobTitle: job.title });
  return job;
}

export async function rejectJob(jobId, adminId, reason) {
  const job = flaggedJobs.find(j => j.id === jobId);
  if (!job) throw new Error("Job not found");
  job.status = "rejected";
  job.rejectionReason = reason;
  appendToAudit("job_reject", adminId, { jobId, jobTitle: job.title, reason });
  return job;
}

// ── Dispute Resolution ──────────────────────────────────────────────

export async function getDisputes(filters = {}) {
  let result = [...disputes];
  if (filters.status) result = result.filter(d => d.status === filters.status);
  return { disputes: result, total: result.length };
}

export async function getDisputeDetail(disputeId) {
  const dispute = disputes.find(d => d.id === disputeId);
  if (!dispute) throw new Error("Dispute not found");
  return dispute;
}

export async function resolveDispute(disputeId, adminId, ruling) {
  const dispute = disputes.find(d => d.id === disputeId);
  if (!dispute) throw new Error("Dispute not found");
  dispute.status = ruling === "escalate" ? "open" : "resolved";
  dispute.ruling = ruling;
  dispute.resolvedAt = new Date().toISOString();
  appendToAudit("dispute_resolve", adminId, { disputeId, ruling });
  return dispute;
}

// ── Platform Controls ───────────────────────────────────────────────

export async function getPlatformSettings() {
  return { ...platformSettings };
}

export async function updatePlatformSetting(key, value, adminId) {
  if (!(key in platformSettings)) throw new Error(`Unknown setting: ${key}`);
  const oldValue = platformSettings[key];
  platformSettings[key] = value;
  appendToAudit("setting_change", adminId, { key, from: oldValue, to: value });
  return { ...platformSettings };
}

// ── Audit Log ───────────────────────────────────────────────────────

export async function getAuditLog(filters = {}) {
  let result = [...auditLog];
  if (filters.action) result = result.filter(e => e.action === filters.action);
  if (filters.adminId) result = result.filter(e => e.adminId === filters.adminId);
  if (filters.from) result = result.filter(e => e.timestamp >= filters.from);
  if (filters.to) result = result.filter(e => e.timestamp <= filters.to);
  // Sort newest first
  result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return { entries: result, total: result.length };
}
