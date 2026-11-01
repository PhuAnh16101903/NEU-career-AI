from typing import List, Optional, Tuple

from app.data.skill_taxonomy import SKILLS
from app.schemas.curriculum import CourseItem

# DỮ LIỆU MẪU: mã môn và nội dung chỉ để chạy thử. Người phụ trách dữ liệu NEU thay bằng
# chương trình đào tạo thật. `skills_provided` BẮT BUỘC dùng tên chuẩn trong skill_taxonomy.SKILLS.
SAMPLE_NEU_COURSES: List[CourseItem] = [
    CourseItem(
        id="neu_01",
        code="THVP1102",
        name="Khai phá dữ liệu trong kinh doanh",
        credits=3,
        major="Hệ thống thông tin quản lý / Khoa học dữ liệu",
        description="Kỹ thuật khai phá dữ liệu, trực quan hóa và mô hình phân loại dự báo.",
        skills_provided=["Data Mining", "Power BI", "Tableau", "Machine Learning"],
    ),
    CourseItem(
        id="neu_02",
        code="CNTT1105",
        name="Cơ sở dữ liệu và SQL nâng cao",
        credits=3,
        major="Công nghệ thông tin / Hệ thống thông tin quản lý",
        description="Thiết kế CSDL quan hệ, tối ưu truy vấn SQL phức tạp.",
        skills_provided=["SQL", "Database Design", "PostgreSQL"],
    ),
    CourseItem(
        id="neu_03",
        code="QTKD1120",
        name="Phân tích nghiệp vụ doanh nghiệp",
        credits=3,
        major="Quản trị kinh doanh / Hệ thống thông tin quản lý",
        description="Khảo sát, đặc tả yêu cầu, vẽ BPMN và viết tài liệu BRD/SRS.",
        skills_provided=["BPMN", "Business Analysis", "Viết tài liệu BRD", "Phân tích yêu cầu"],
    ),
    CourseItem(
        id="neu_04",
        code="TCNH1108",
        name="Công nghệ tài chính và Phân tích định lượng",
        credits=3,
        major="Tài chính - Ngân hàng",
        description="Ứng dụng Python phân tích chuỗi thời gian tài chính và rủi ro tín dụng.",
        skills_provided=["Python", "Quantitative Analysis", "Fintech"],
    ),
    CourseItem(
        id="neu_05",
        code="TOKT1101",
        name="Thống kê ứng dụng trong kinh tế",
        credits=3,
        major="Thống kê kinh tế",
        description="Thống kê mô tả, suy diễn và phân tích dữ liệu kinh tế bằng Excel.",
        skills_provided=["Thống kê", "Excel"],
    ),
]

_unknown = {s for c in SAMPLE_NEU_COURSES for s in c.skills_provided} - SKILLS.keys()
if _unknown:
    raise ValueError(f"Môn học dùng kỹ năng chưa có trong Skill Taxonomy: {sorted(_unknown)}")


class CurriculumService:
    @staticmethod
    def get_all_courses(
        q: Optional[str] = None,
        major: Optional[str] = None,
    ) -> List[CourseItem]:
        courses = list(SAMPLE_NEU_COURSES)
        if major and major.strip():
            m = major.strip().lower()
            courses = [c for c in courses if m in c.major.lower()]
        if q and q.strip():
            kw = q.strip().lower()
            courses = [
                c
                for c in courses
                if kw in c.code.lower()
                or kw in c.name.lower()
                or kw in c.description.lower()
                or any(kw in s.lower() for s in c.skills_provided)
            ]
        return courses

    @staticmethod
    def find_courses_for_skills(missing_skills: List[str]) -> List[Tuple[CourseItem, List[str]]]:
        """
        Với danh sách kỹ năng chuẩn còn thiếu, trả về [(môn học, các kỹ năng thiếu mà môn đó bù được)],
        sắp xếp theo số kỹ năng bù được giảm dần.
        """
        missing = set(missing_skills)
        results = []
        for course in SAMPLE_NEU_COURSES:
            covered = [s for s in course.skills_provided if s in missing]
            if covered:
                results.append((course, covered))
        results.sort(key=lambda item: len(item[1]), reverse=True)
        return results


curriculum_service = CurriculumService()
