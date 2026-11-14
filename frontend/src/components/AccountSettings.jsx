import { t as tr, useLocale, LanguageToggle } from "../i18n";
import { ThemeToggle } from "./ThemeFrame";
import { PageHead } from "./UI";
export default function AccountSettings({ user }) {
  useLocale();
  return (
    <>
      <PageHead title={tr("Cài đặt tài khoản")}>
        {tr("Thông tin cá nhân và tùy chọn hiển thị.")}
      </PageHead>
      <div className="settings-grid">
        <section className="panel">
          <h2>{tr("Hồ sơ tài khoản")}</h2>
          <p className="helper" id="profile-availability">
            {tr(
              "Hiện chỉ xem thông tin. Chỉnh sửa hồ sơ sẽ khả dụng khi API được kết nối.",
            )}
          </p>
          <dl
            className="profile-details"
            aria-describedby="profile-availability"
          >
            {[
              ["Họ và tên", user.full_name],
              ["Email", user.email],
              [
                "Vai trò",
                tr(
                  {
                    student: "Sinh viên",
                    enterprise: "Doanh nghiệp",
                    admin: "Quản trị viên",
                  }[user.role],
                ),
              ],
              ...(user.role === "student"
                ? [["Chuyên ngành", user.student_major]]
                : user.role === "enterprise"
                  ? [["Tên doanh nghiệp", user.company_name]]
                  : []),
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{tr(label)}</dt>
                <dd>{value || tr("Chưa cập nhật")}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="settings-stack">
          <section className="panel">
            <h2>{tr("Giao diện và ngôn ngữ")}</h2>
            <div className="settings-option">
              <span>{tr("Chế độ sáng / tối")}</span>
              <ThemeToggle />
            </div>
            <div className="settings-option">
              <span>{tr("Ngôn ngữ hiển thị")}</span>
              <LanguageToggle />
            </div>
          </section>
          <section className="panel">
            <h2>{tr("Bảo mật")}</h2>
            <p>{tr("Đổi mật khẩu chưa khả dụng vì chưa có API hỗ trợ.")}</p>
            <button type="button" className="button secondary" disabled>
              {tr("Đổi mật khẩu")}
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
