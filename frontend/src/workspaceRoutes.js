export const studentTabs = [
  { id: "cv", label: "Phân tích CV", icon: "file" },
  { id: "matching", label: "So khớp kỹ năng", icon: "target" },
  { id: "interview", label: "Phỏng vấn STAR", icon: "chat" },
  { id: "courses", label: "Học phần NEU", icon: "book" },
  { id: "opportunities", label: "Cơ hội việc làm", icon: "briefcase" },
];
const enterpriseTabs = [
  { id: "recruitment", label: "Đăng tuyển", icon: "briefcase" },
  { id: "candidates", label: "Tìm ứng viên", icon: "user" },
];
const adminTabs = [
  { id: "overview", label: "Tổng quan", icon: "target" },
  { id: "users", label: "Quản lý người dùng", icon: "user" },
  { id: "moderation", label: "Kiểm duyệt tin", icon: "check" },
];
export const settingsTab = {
  id: "settings",
  label: "Cài đặt tài khoản",
  icon: "settings",
};
export const workspaceTabs = [
  ...studentTabs,
  ...enterpriseTabs,
  ...adminTabs,
  settingsTab,
  { id: "auth", label: "Tài khoản", icon: "user" },
];
export function tabsFor(user) {
  return user?.role === "admin"
    ? adminTabs
    : user?.role === "enterprise"
      ? enterpriseTabs
      : user
        ? studentTabs
        : studentTabs.slice(0, 4);
}
export function workspaceDestination(id, user) {
  if (id === "auth" || id === "settings") return user ? "settings" : "login";
  if (!workspaceTabs.some((t) => t.id === id)) return id;
  if (tabsFor(user).some((t) => t.id === id)) return id;
  return user ? tabsFor(user)[0].id : "login";
}
