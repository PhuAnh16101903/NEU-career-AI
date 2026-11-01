"""
Skill Taxonomy dùng chung cho CV parser, matching và danh mục môn học NEU.

Mỗi kỹ năng chuẩn (canonical) có một nhóm và danh sách alias (viết thường). Mọi chỗ cần so sánh
kỹ năng phải đi qua `normalize_skill` / `extract_skills` thay vì so khớp chuỗi con, để
"PowerBI" == "Power BI" và không bao giờ có chuyện "sql" khớp nhầm "postgresql".

Cách mở rộng: thêm dòng vào SKILLS (nhóm Data/BA/AI cùng bổ sung khi thu thập thêm JD).
"""
import re
from typing import Dict, List, Optional, Tuple

HARD = "Kỹ năng chuyên môn"
TOOL = "Công cụ"
BUSINESS = "Nghiệp vụ"
SOFT = "Kỹ năng mềm"
LANG = "Ngoại ngữ"

# canonical -> (nhóm, [alias viết thường])
SKILLS: Dict[str, Tuple[str, List[str]]] = {
    "Python": (HARD, ["python", "python3", "lập trình python"]),
    "SQL": (HARD, ["sql", "t-sql", "mysql", "sql server", "truy vấn sql", "sql nâng cao"]),
    "Java": (HARD, ["java", "core java"]),
    "JavaScript": (HARD, ["javascript", "js", "typescript", "node.js", "nodejs"]),
    "Machine Learning": (HARD, ["machine learning", "ml", "học máy"]),
    "Data Mining": (HARD, ["data mining", "khai phá dữ liệu"]),
    "Database Design": (HARD, ["database design", "thiết kế cơ sở dữ liệu", "thiết kế csdl"]),
    "Thống kê": (HARD, ["thống kê", "statistics", "statistical analysis", "xác suất thống kê"]),
    "Quantitative Analysis": (HARD, ["quantitative analysis", "phân tích định lượng"]),
    "Excel": (TOOL, ["excel", "microsoft excel", "ms excel", "google sheets"]),
    "Power BI": (TOOL, ["power bi", "powerbi", "power-bi"]),
    "Tableau": (TOOL, ["tableau"]),
    "PostgreSQL": (TOOL, ["postgresql", "postgres"]),
    "Git": (TOOL, ["git", "github", "gitlab"]),
    "Business Analysis": (BUSINESS, ["business analysis", "phân tích nghiệp vụ"]),
    "BPMN": (BUSINESS, ["bpmn", "vẽ quy trình", "mô hình hóa quy trình"]),
    "Viết tài liệu BRD": (BUSINESS, ["brd", "srs", "viết tài liệu brd", "tài liệu yêu cầu"]),
    "Phân tích yêu cầu": (BUSINESS, ["phân tích yêu cầu", "requirement analysis", "thu thập yêu cầu"]),
    "Fintech": (BUSINESS, ["fintech", "công nghệ tài chính"]),
    "Làm việc nhóm": (SOFT, ["làm việc nhóm", "teamwork", "kỹ năng làm việc nhóm"]),
    "Tư duy logic": (SOFT, ["tư duy logic", "logical thinking", "tư duy phân tích"]),
    "Giao tiếp": (SOFT, ["giao tiếp", "communication", "kỹ năng giao tiếp"]),
    "Thuyết trình": (SOFT, ["thuyết trình", "presentation"]),
    "Giải quyết vấn đề": (SOFT, ["giải quyết vấn đề", "problem solving"]),
    "Tiếng Anh": (LANG, ["tiếng anh", "english", "ielts", "toeic", "tiếng anh giao tiếp"]),
}

# Mỗi vị trí phổ biến -> bộ kỹ năng yêu cầu mặc định (dùng khi người dùng không gửi JD).
ROLE_PRESETS: List[Tuple[List[str], List[str]]] = [
    (
        ["data analyst", "phân tích dữ liệu", "data scientist", "khoa học dữ liệu"],
        ["SQL", "Python", "Excel", "Power BI", "Thống kê", "Tư duy logic", "Tiếng Anh"],
    ),
    (
        ["business analyst", "ba", "phân tích nghiệp vụ"],
        ["Business Analysis", "BPMN", "Viết tài liệu BRD", "Phân tích yêu cầu", "SQL", "Giao tiếp", "Tiếng Anh"],
    ),
    (
        ["software engineer", "developer", "lập trình viên", "backend", "frontend"],
        ["Python", "Java", "JavaScript", "Git", "Database Design", "SQL", "Giải quyết vấn đề"],
    ),
    (
        ["tài chính", "ngân hàng", "fintech", "finance"],
        ["Excel", "Python", "Quantitative Analysis", "Fintech", "Thống kê", "Tiếng Anh"],
    ),
]

_ALIAS_TO_CANONICAL: Dict[str, str] = {}
for _canonical, (_category, _aliases) in SKILLS.items():
    _ALIAS_TO_CANONICAL[_canonical.lower()] = _canonical
    for _alias in _aliases:
        _ALIAS_TO_CANONICAL[_alias] = _canonical


def _boundary_pattern(term: str) -> re.Pattern:
    # Ranh giới từ có tính cả + và # để "java" không khớp "javascript", "c" không khớp "c++".
    return re.compile(r"(?<![\w+#])" + re.escape(term) + r"(?![\w+#])", re.IGNORECASE)


_ALIAS_PATTERNS: List[Tuple[str, re.Pattern]] = [
    (alias, _boundary_pattern(alias)) for alias in sorted(_ALIAS_TO_CANONICAL, key=len, reverse=True)
]


def normalize_skill(text: str) -> Optional[str]:
    """Trả về tên chuẩn của kỹ năng nếu `text` khớp CHÍNH XÁC một alias, ngược lại None."""
    return _ALIAS_TO_CANONICAL.get(text.strip().lower())


def category_of(canonical: str) -> str:
    return SKILLS[canonical][0]


def extract_skills(text: str) -> List[str]:
    """Quét văn bản tự do (CV, JD) và trả về các kỹ năng chuẩn xuất hiện, theo thứ tự taxonomy."""
    found = set()
    for alias, pattern in _ALIAS_PATTERNS:
        if pattern.search(text):
            found.add(_ALIAS_TO_CANONICAL[alias])
    return [skill for skill in SKILLS if skill in found]


def role_requirements(job_title: str) -> Optional[List[str]]:
    """Bộ kỹ năng mặc định cho vị trí, hoặc None nếu không nhận diện được."""
    for keywords, skills in ROLE_PRESETS:
        if any(_boundary_pattern(k).search(job_title) for k in keywords):
            return list(skills)
    return None
