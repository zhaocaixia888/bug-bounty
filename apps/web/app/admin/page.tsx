"use client";

import { useState, useEffect, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════

interface Metrics {
  totalUsers: number;
  activeFreelancers: number;
  openJobs: number;
  openDisputes: number;
  flaggedListings: number;
  monthlyVolume: number;
  trustScoreDistribution: Record<string, number>;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joinDate: string;
  activeJobs: number;
  disputeCount: number;
}

interface FlaggedJob {
  id: string;
  title: string;
  postedBy: string;
  flaggedReason: string;
  status: string;
  createdAt: string;
}

interface Dispute {
  id: string;
  jobTitle: string;
  freelancer: string;
  client: string;
  status: string;
  amount: number;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  adminId: string;
  details: Record<string, string>;
  timestamp: string;
}

interface PlatformSettings {
  registrationOpen: boolean;
  jobPostingOpen: boolean;
}

// ══════════════════════════════════════════════════════════════════════
// API helper
// ══════════════════════════════════════════════════════════════════════

const API = "/api/admin";

async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Request failed");
  return json.data;
}

// ══════════════════════════════════════════════════════════════════════
// UI Components
// ══════════════════════════════════════════════════════════════════════

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md" role="region" aria-label={label}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-8" role="status"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /><span className="sr-only">Loading...</span></div>;
}

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700" role="alert">{message}</div>;
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-400" role="status">{label}</div>;
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50" aria-label="Cancel">Cancel</button>
          <button onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700" aria-label="Confirm">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Section Components
// ══════════════════════════════════════════════════════════════════════

function MetricsDashboard({ metrics }: { metrics: Metrics | null; loading: boolean }) {
  if (!metrics) return <Spinner />;
  return (
    <section aria-label="Trust and metrics dashboard">
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Total Users" value={metrics.totalUsers} color="text-blue-600" />
        <SummaryCard label="Active Freelancers" value={metrics.activeFreelancers} color="text-green-600" />
        <SummaryCard label="Open Jobs" value={metrics.openJobs} color="text-purple-600" />
        <SummaryCard label="Open Disputes" value={metrics.openDisputes} color="text-orange-600" />
        <SummaryCard label="Flagged Listings" value={metrics.flaggedListings} color="text-red-600" />
        <SummaryCard label="Monthly Volume" value={`$${(metrics.monthlyVolume / 1000).toFixed(1)}k`} color="text-emerald-600" />
      </div>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-medium text-gray-500">Trust Score Distribution</h3>
        <div className="flex h-6 gap-1 rounded-full overflow-hidden" role="img" aria-label="Trust score distribution: high 65%, medium 25%, low 10%">
          <div className="bg-green-500" style={{ width: `${metrics.trustScoreDistribution.high}%` }} title={`High: ${metrics.trustScoreDistribution.high}%`} />
          <div className="bg-yellow-500" style={{ width: `${metrics.trustScoreDistribution.medium}%` }} title={`Medium: ${metrics.trustScoreDistribution.medium}%`} />
          <div className="bg-red-500" style={{ width: `${metrics.trustScoreDistribution.low}%` }} title={`Low: ${metrics.trustScoreDistribution.low}%`} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span>🟢 High {metrics.trustScoreDistribution.high}%</span>
          <span>🟡 Medium {metrics.trustScoreDistribution.medium}%</span>
          <span>🔴 Low {metrics.trustScoreDistribution.low}%</span>
        </div>
      </div>
    </section>
  );
}

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      const data = await fetchAPI(`/users?${params}`);
      setUsers(data.users);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const action = async (userId: string, action: string) => {
    try {
      await fetchAPI(`/users/${userId}/${action}`, { method: "POST" });
      fetchUsers();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <section aria-label="User management">
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border px-3 py-2 text-sm min-w-[200px]"
          aria-label="Search users"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" aria-label="Filter by role">
          <option value="">All Roles</option>
          <option value="freelancer">Freelancer</option>
          <option value="client">Client</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error && <ErrorBox message={error} />}
      {loading ? <Spinner /> : users.length === 0 ? <EmptyState label="No users found" /> : (
        <div className="overflow-x-auto rounded-xl border" role="table" aria-label="Users table">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500" scope="col">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500" scope="col">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500" scope="col">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500" scope="col">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500" scope="col">Jobs</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === "admin" ? "bg-purple-100 text-purple-700" :
                      u.role === "freelancer" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.status === "active" ? "bg-green-100 text-green-700" :
                      u.status === "suspended" ? "bg-yellow-100 text-yellow-700" :
                      u.status === "banned" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.activeJobs}</td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== "admin" && (
                      <div className="flex justify-end gap-2" role="group" aria-label="User actions">
                        {u.status === "active" && <button onClick={() => action(u.id, "suspend")} className="rounded px-2 py-1 text-xs font-medium text-yellow-600 hover:bg-yellow-50">Suspend</button>}
                        {u.status === "suspended" && <button onClick={() => action(u.id, "reinstate")} className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50">Reinstate</button>}
                        <button onClick={() => action(u.id, "ban")} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Ban</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function JobModeration() {
  const [jobs, setJobs] = useState<FlaggedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectJobId, setRejectJobId] = useState("");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAPI("/flagged-jobs");
      setJobs(data.jobs);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const approve = async (jobId: string) => {
    try { await fetchAPI(`/flagged-jobs/${jobId}/approve`, { method: "POST" }); fetchJobs(); }
    catch (e: any) { setError(e.message); }
  };

  const reject = async () => {
    if (!rejectJobId || !rejectReason) return;
    try {
      await fetchAPI(`/flagged-jobs/${rejectJobId}/reject`, { method: "POST", body: JSON.stringify({ reason: rejectReason }) });
      setRejectJobId("");
      setRejectReason("");
      fetchJobs();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <section aria-label="Job and listing moderation">
      {error && <ErrorBox message={error} />}
      {loading ? <Spinner /> : jobs.length === 0 ? <EmptyState label="No flagged listings" /> : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{job.title}</h4>
                  <p className="mt-1 text-sm text-gray-500">Posted by: {job.postedBy}</p>
                  <p className="text-sm text-gray-500">Reason: {job.flaggedReason}</p>
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    job.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                    job.status === "approved" ? "bg-green-100 text-green-700" :
                    "bg-red-100 text-red-700"
                  }`}>{job.status}</span>
                </div>
                {job.status === "pending" && (
                  <div className="flex gap-2" role="group" aria-label="Moderation actions">
                    <button onClick={() => approve(job.id)} className="rounded-lg border border-green-200 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50">Approve</button>
                    <button onClick={() => setRejectJobId(job.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50">Reject</button>
                  </div>
                )}
              </div>
              {rejectJobId === job.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="flex-1 rounded-lg border px-3 py-2 text-sm"
                    aria-label="Rejection reason"
                    autoFocus
                  />
                  <button onClick={reject} disabled={!rejectReason} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">Confirm Reject</button>
                  <button onClick={() => { setRejectJobId(""); setRejectReason(""); }} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DisputeResolution() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAPI("/disputes");
      setDisputes(data.disputes);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const resolve = async (disputeId: string, ruling: string) => {
    try {
      await fetchAPI(`/disputes/${disputeId}/resolve`, { method: "POST", body: JSON.stringify({ ruling }) });
      fetchDisputes();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <section aria-label="Dispute resolution">
      {error && <ErrorBox message={error} />}
      {loading ? <Spinner /> : disputes.length === 0 ? <EmptyState label="No disputes" /> : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <div key={d.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{d.jobTitle}</h4>
                  <p className="mt-1 text-sm text-gray-500">{d.freelancer} vs {d.client}</p>
                  <p className="text-sm text-gray-500">Amount: ${d.amount} | Created: {d.createdAt}</p>
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    d.status === "open" ? "bg-red-100 text-red-700" :
                    d.status === "under_review" ? "bg-yellow-100 text-yellow-700" :
                    "bg-green-100 text-green-700"
                  }`}>{d.status}</span>
                </div>
                {d.status !== "resolved" && (
                  <div className="flex gap-2" role="group" aria-label="Dispute actions">
                    <button onClick={() => resolve(d.id, "favor_freelancer")} className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50">Rule for Freelancer</button>
                    <button onClick={() => resolve(d.id, "favor_client")} className="rounded-lg border border-green-200 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50">Rule for Client</button>
                    <button onClick={() => resolve(d.id, "escalate")} className="rounded-lg border border-orange-200 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50">Escalate</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PlatformControls() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<{ key: string; value: boolean } | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAPI("/settings");
      setSettings(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const toggle = async (key: string, value: boolean) => {
    try {
      const data = await fetchAPI("/settings", { method: "PUT", body: JSON.stringify({ key, value }) });
      setSettings(data);
      setConfirm(null);
    } catch (e: any) { setError(e.message); }
  };

  if (loading) return <Spinner />;
  if (!settings) return <ErrorBox message="Failed to load settings" />;

  return (
    <section aria-label="Platform controls">
      {error && <ErrorBox message={error} />}
      <ConfirmDialog
        open={!!confirm}
        title="Confirm Setting Change"
        message={`Are you sure you want to ${confirm?.value ? "enable" : "disable"} this setting? This action will be logged.`}
        onConfirm={() => confirm && toggle(confirm.key, confirm.value)}
        onCancel={() => setConfirm(null)}
      />
      <div className="space-y-4">
        {[
          { key: "registrationOpen", label: "New User Registrations", description: "Allow new users to create accounts" },
          { key: "jobPostingOpen", label: "New Job Postings", description: "Allow clients to post new jobs" },
        ].map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
            <div>
              <h4 className="font-medium">{label}</h4>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
            <button
              onClick={() => setConfirm({ key, value: !(settings as any)[key] })}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                (settings as any)[key] ? "bg-green-500" : "bg-gray-300"
              }`}
              role="switch"
              aria-checked={(settings as any)[key]}
              aria-label={label}
            >
              <span className={`absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow transition-transform ${
                (settings as any)[key] ? "translate-x-6" : "translate-x-0.5"
              }`} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function AuditLogViewer() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchAPI("/audit-log");
        setEntries(data.entries);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const actionLabel = (action: string) => {
    const map: Record<string, string> = {
      user_suspend: "User Suspended",
      user_reinstate: "User Reinstated",
      user_ban: "User Banned",
      job_approve: "Job Approved",
      job_reject: "Job Rejected",
      dispute_resolve: "Dispute Resolved",
      setting_change: "Setting Changed",
    };
    return map[action] || action;
  };

  return (
    <section aria-label="Audit log">
      {error && <ErrorBox message={error} />}
      {loading ? <Spinner /> : entries.length === 0 ? <EmptyState label="No audit entries" /> : (
        <div className="overflow-x-auto rounded-xl border" role="table" aria-label="Audit log table">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500" scope="col">Action</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500" scope="col">Admin</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500" scope="col">Details</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500" scope="col">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium">{actionLabel(e.action)}</span></td>
                  <td className="px-4 py-3 text-gray-500">{e.adminId}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{JSON.stringify(e.details)}</td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">{new Date(e.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Main Admin Panel
// ══════════════════════════════════════════════════════════════════════

type Tab = "metrics" | "users" | "jobs" | "disputes" | "controls" | "audit";

const TABS: { id: Tab; label: string }[] = [
  { id: "metrics", label: "Dashboard" },
  { id: "users", label: "Users" },
  { id: "jobs", label: "Moderation" },
  { id: "disputes", label: "Disputes" },
  { id: "controls", label: "Controls" },
  { id: "audit", label: "Audit Log" },
];

export default function AdminPanelPage() {
  const [activeTab, setActiveTab] = useState<Tab>("metrics");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setMetricsLoading(true);
      try {
        const data = await fetchAPI("/metrics");
        setMetrics(data);
      } catch { /* handled by child */ }
      finally { setMetricsLoading(false); }
    })();
  }, []);

  return (
    <section className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-1">Moderation queues, trust metrics, and platform controls</p>
        </div>
        <button
          onClick={() => {
            setMetricsLoading(true);
            fetchAPI("/metrics").then(setMetrics).catch(() => {}).finally(() => setMetricsLoading(false));
          }}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          aria-label="Refresh dashboard data"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-1 border-b" role="tablist" aria-label="Admin panel sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === "metrics" && <MetricsDashboard metrics={metrics} loading={metricsLoading} />}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "jobs" && <JobModeration />}
        {activeTab === "disputes" && <DisputeResolution />}
        {activeTab === "controls" && <PlatformControls />}
        {activeTab === "audit" && <AuditLogViewer />}
      </div>
    </section>
  );
}
