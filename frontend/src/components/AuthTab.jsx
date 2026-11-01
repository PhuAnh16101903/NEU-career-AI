/**
 * Màn hình Đăng nhập / Đăng ký & Phân quyền 3 Actor (Sinh viên - Doanh nghiệp - Admin)
 *
 * TODO (Nhánh feat/frontend-ui):
 * 1. Form Đăng nhập:
 *    - Ô nhập `email` và `password` -> gọi `await careerApi.login(email, password)`.
 *    - Lưu thông tin người dùng bằng `onAuthSuccess(res.user)`.
 *    - Gợi ý 3 tài khoản mẫu trên giao diện để bấm test nhanh (Mật khẩu chung: 123456):
 *      + Sinh viên (`student`): phu@st.neu.edu.vn
 *      + Doanh nghiệp (`enterprise`): hr@fpt.com
 *      + Quản trị viên (`admin`): admin@neu.edu.vn
 *
 * 2. Form Đăng ký tài khoản mới:
 *    - Ô nhập `full_name`, `email`, `password` (tối thiểu 6 ký tự).
 *    - Chọn vai trò (`role`):
 *      + `"student"` (Sinh viên NEU) -> hiển thị thêm ô nhập `student_major` (Chuyên ngành).
 *      + `"enterprise"` (Doanh nghiệp) -> hiển thị thêm ô nhập `company_name` (Tên công ty).
 *    - Gọi `await careerApi.register({ email, password, full_name, role, company_name, student_major })`.
 *
 * 3. Giao diện theo từng Actor sau khi đăng nhập (`currentUser.role`):
 *    - Nếu `role === "enterprise"`: Hiển thị form Đăng tin tuyển dụng (`careerApi.createEnterpriseJob`)
 *      và danh sách ứng viên nộp đơn kèm điểm % độ khớp (`careerApi.getJobCandidates`).
 *    - Nếu `role === "admin"`: Hiển thị bảng thống kê hệ thống (`careerApi.getAdminStats`)
 *      và danh sách quản lý người dùng (`careerApi.getAdminUsers`).
 */
export default function AuthTab({ currentUser, onAuthSuccess, onLogout }) {
  return (
    <section>
      <h2>Đăng nhập / Đăng ký (3 Actor: Sinh viên – Doanh nghiệp – Admin)</h2>
      <p>
        Tích hợp <code>careerApi.login(email, password)</code> và{' '}
        <code>careerApi.register(payload)</code> tại component này.
      </p>
      {currentUser && (
        <p>
          Đang đăng nhập: <strong>{currentUser.full_name}</strong> ({currentUser.email}) — Vai trò:{' '}
          <code>{currentUser.role}</code>{' '}
          <button type="button" onClick={onLogout}>
            Đăng xuất
          </button>
        </p>
      )}
    </section>
  )
}
