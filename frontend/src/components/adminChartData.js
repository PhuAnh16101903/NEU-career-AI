/** Only consume values returned by the existing admin endpoints. No mock data. */
const count = (value) => Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;

export function overviewSeries(stats) {
  if (!stats) return null;
  const users = [
    { key: "student", label: "Sinh viên", value: count(stats.total_students), color: "var(--admin-evergreen)" },
    { key: "enterprise", label: "Doanh nghiệp", value: count(stats.total_enterprises), color: "var(--admin-red)" },
    { key: "admin", label: "Quản trị viên", value: count(stats.total_admins), color: "var(--admin-gold)" },
  ];
  // The backend defines exactly three job statuses: pending, approved, rejected.
  const jobs = [
    { key: "approved", label: "Đã duyệt", value: count(stats.approved_jobs), color: "var(--admin-evergreen)" },
    { key: "pending", label: "Chờ duyệt", value: count(stats.pending_jobs), color: "var(--admin-gold)" },
    {
      key: "rejected", label: "Đã từ chối",
      value: Math.max(0, count(stats.total_jobs) - count(stats.approved_jobs) - count(stats.pending_jobs)),
      color: "var(--admin-red)",
    },
  ];
  const operations = [
    { key: "applications", label: "Hồ sơ ứng tuyển", value: count(stats.total_applications), color: "var(--admin-evergreen)" },
    { key: "interviews", label: "Buổi phỏng vấn", value: count(stats.total_interviews), color: "var(--admin-red)" },
  ];
  return { users, jobs, operations };
}

const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shortDay = (date) => `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;

/** Actual job counts grouped by creation date; periods never alter the all-time cards. */
export function jobTimeBuckets(jobs, days = 30, clock = new Date()) {
  if (!Array.isArray(jobs) || ![7, 30, 90].includes(days)) return [];
  const today = new Date(clock);
  if (!Number.isFinite(today.getTime())) return [];
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - days + 1);
  const validJobs = jobs.filter((job) => job && job.created_at && Number.isFinite(new Date(job.created_at).getTime()));
  const countByDate = new Map();
  for (const job of validJobs) {
    const date = new Date(job.created_at);
    if (date < start || date >= new Date(today.getTime() + 24 * 60 * 60 * 1000)) continue;
    const key = dateKey(date);
    countByDate.set(key, (countByDate.get(key) || 0) + 1);
  }
  const bucketSize = days === 7 ? 1 : days === 30 ? 5 : 10;
  const output = [];
  for (let n = 0; n < days; n += bucketSize) {
    const from = new Date(start);
    from.setDate(start.getDate() + n);
    const to = new Date(start);
    to.setDate(start.getDate() + Math.min(days - 1, n + bucketSize - 1));
    let value = 0;
    for (let offset = n; offset < Math.min(n + bucketSize, days); offset++) {
      const day = new Date(start);
      day.setDate(start.getDate() + offset);
      value += countByDate.get(dateKey(day)) || 0;
    }
    output.push({ key: dateKey(from), label: bucketSize === 1 ? shortDay(from) : `${shortDay(from)}–${shortDay(to)}`, value });
  }
  return output;
}
