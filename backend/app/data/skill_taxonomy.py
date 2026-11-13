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
    # Programming languages
    "Python": (HARD, ["python", "python3", "lập trình python"]),
    "Java": (HARD, ["java", "core java"]),
    "JavaScript": (HARD, ["js"]),
    "TypeScript": (HARD, []),
    "C": (HARD, ["c programming", "ngôn ngữ c", "ngôn ngữ lập trình c"]),
    "C++": (HARD, ["c++", "cpp"]),
    "C#": (HARD, ["c#", "c sharp"]),
    "PHP": (HARD, ["php"]),
    "Go": (HARD, ["golang", "go language"]),
    "Kotlin": (HARD, ["kotlin"]),
    "Dart": (HARD, ["dart"]),
    "R": (HARD, ["r programming", "ngôn ngữ r", "ngôn ngữ lập trình r"]),

    # Web development
    "HTML": (HARD, ["html", "html5"]),
    "CSS": (HARD, ["css", "css3"]),
    "React": (HARD, ["react", "reactjs", "react.js"]),
    "Vue.js": (HARD, ["vue", "vuejs", "vue.js"]),
    "Angular": (HARD, ["angular", "angularjs"]),
    "Flask": (HARD, ["flask", "python flask"]),
    "Django": (HARD, ["django"]),
    "FastAPI": (HARD, ["fastapi", "fast api"]),
    "REST API": (HARD, ["rest api", "restful api", "restful"]),
    "GraphQL": (HARD, ["graphql"]),
    "Node.js": (HARD, ["nodejs"]),

    # Database
    "SQL": (HARD, ["sql", "t-sql", "truy vấn sql", "sql nâng cao"]),
    "Database Design": (HARD, ["database design", "thiết kế cơ sở dữ liệu", "thiết kế csdl"]),
    "SQLite": (TOOL, ["sqlite", "sqlite3"]),
    "MySQL": (TOOL, ["mysql"]),
    "PostgreSQL": (TOOL, ["postgresql", "postgres"]),
    "SQL Server": (TOOL, ["sql server", "mssql"]),
    "MongoDB": (TOOL, ["mongodb", "mongo"]),
    "Redis": (TOOL, ["redis"]),

    # Software engineering and DevOps
    "Git": (TOOL, ["git", "github", "gitlab"]),
    "Docker": (TOOL, ["docker", "containerization"]),
    "Kubernetes": (TOOL, ["kubernetes", "k8s"]),
    "Linux": (TOOL, ["linux", "ubuntu", "debian"]),
    "CI/CD": (TOOL, ["ci/cd", "continuous integration", "continuous deployment"]),
    "Unit Testing": (HARD, ["unit testing", "kiểm thử đơn vị"]),
    "Debugging": (HARD, ["debugging", "debug", "gỡ lỗi"]),
    "OOP": (HARD, ["oop", "object oriented programming", "lập trình hướng đối tượng"]),
    "Data Structures": (HARD, ["data structures", "cấu trúc dữ liệu"]),
    "Algorithms": (HARD, ["algorithms", "thuật toán"]),

    # Cybersecurity
    "Network Security": (HARD, ["network security", "an ninh mạng"]),
    "Penetration Testing": (HARD, ["penetration testing", "pentest", "kiểm thử xâm nhập"]),
    "OWASP": (HARD, ["owasp", "owasp top 10"]),
    "Cryptography": (HARD, ["cryptography", "mật mã học"]),
    "Information Security": (HARD, ["information security", "bảo mật thông tin", "an toàn thông tin"]),
    "Wireshark": (TOOL, ["wireshark"]),
    "Nmap": (TOOL, ["nmap"]),
    "Burp Suite": (TOOL, ["burp suite", "burpsuite"]),

    # AI and Data
    "Machine Learning": (HARD, ["machine learning", "ml", "học máy"]),
    "Deep Learning": (HARD, ["deep learning", "học sâu"]),
    "Data Mining": (HARD, ["data mining", "khai phá dữ liệu"]),
    "Thống kê": (HARD, ["thống kê", "statistics", "statistical analysis", "xác suất thống kê"]),
    "Quantitative Analysis": (HARD, ["quantitative analysis", "phân tích định lượng"]),
    "Excel": (TOOL, ["excel", "microsoft excel", "ms excel", "google sheets"]),
    "Power BI": (TOOL, ["power bi", "powerbi", "power-bi"]),
    "Tableau": (TOOL, ["tableau"]),
    "Pandas": (TOOL, ["pandas"]),
    "NumPy": (TOOL, ["numpy"]),
    "TensorFlow": (TOOL, ["tensorflow"]),
    "PyTorch": (TOOL, ["pytorch"]),

    # Business
    "Business Analysis": (BUSINESS, ["business analysis", "phân tích nghiệp vụ"]),
    "BPMN": (BUSINESS, ["bpmn", "vẽ quy trình", "mô hình hóa quy trình"]),
    "Viết tài liệu BRD": (BUSINESS, ["brd", "srs", "viết tài liệu brd", "tài liệu yêu cầu"]),
    "Phân tích yêu cầu": (BUSINESS, ["phân tích yêu cầu", "requirement analysis", "thu thập yêu cầu"]),
    "Fintech": (BUSINESS, ["fintech", "công nghệ tài chính"]),

    # Soft skills and languages
    "Làm việc nhóm": (SOFT, ["làm việc nhóm", "teamwork", "kỹ năng làm việc nhóm"]),
    "Tư duy logic": (SOFT, ["tư duy logic", "logical thinking", "tư duy phân tích"]),
    "Giải quyết vấn đề": (SOFT, ["giải quyết vấn đề", "problem solving"]),
    "Giao tiếp": (SOFT, ["giao tiếp", "communication", "kỹ năng giao tiếp"]),
    "Thuyết trình": (SOFT, ["thuyết trình", "presentation"]),
    "Tiếng Anh": (LANG, ["tiếng anh", "english", "ielts", "toeic", "tiếng anh giao tiếp"]),
}


# Mỗi vị trí phổ biến -> bộ kỹ năng yêu cầu mặc định (dùng khi người dùng không gửi JD).
ROLE_PRESETS: List[Tuple[List[str], List[str]]] = [
    # Data
    (
        ["data analyst", "phân tích dữ liệu", "data scientist", "khoa học dữ liệu"],
        ["SQL", "Python", "Excel", "Power BI", "Thống kê", "Tư duy logic", "Tiếng Anh"],
    ),

    # Business
    (
        ["business analyst", "phân tích nghiệp vụ"],
        ["Business Analysis", "BPMN", "Viết tài liệu BRD", "Phân tích yêu cầu", "SQL", "Giao tiếp", "Tiếng Anh"],
    ),

    # General software engineering
    (
        ["software engineer", "kỹ sư phần mềm", "lập trình viên"],
        ["Python", "Java", "JavaScript", "Git", "Database Design", "SQL", "Giải quyết vấn đề"],
    ),

    # Backend
    (
        ["backend developer", "backend engineer", "lập trình backend"],
        ["Python", "Java", "REST API", "Database Design", "SQL", "Git", "Debugging", "Flask"],
    ),

    # Frontend
    (
        ["frontend developer", "frontend engineer", "lập trình frontend"],
        ["HTML", "CSS", "JavaScript", "React", "Git", "Giải quyết vấn đề"],
    ),

    # Full-stack
    (
        ["full stack developer", "fullstack developer", "lập trình full stack"],
        ["HTML", "CSS", "JavaScript", "Python", "REST API", "SQL", "Git", "Debugging"],
    ),

    # Cybersecurity
    (
        ["cybersecurity analyst", "security analyst", "chuyên viên an ninh mạng", "chuyên viên bảo mật"],
        ["Linux", "Network Security", "Information Security", "Penetration Testing", "OWASP", "Wireshark", "Nmap"],
    ),

    # AI / Machine Learning
    (
        ["ai engineer", "machine learning engineer", "kỹ sư trí tuệ nhân tạo", "kỹ sư học máy"],
        ["Python", "Machine Learning", "Deep Learning", "Thống kê", "Pandas", "NumPy", "TensorFlow"],
    ),

    # Finance
    (
        ["tài chính", "ngân hàng", "fintech", "finance"],
        ["Excel", "Python", "Quantitative Analysis", "Fintech", "Thống kê", "Tiếng Anh"],
    ),
]

_ALIAS_TO_CANONICAL: Dict[str, str] = {}

for _canonical, (_category, _aliases) in SKILLS.items():
    # Không tự động thêm tên kỹ năng chỉ có một ký tự như R, C.
    if len(_canonical.strip()) > 1:
        _ALIAS_TO_CANONICAL[_canonical.lower()] = _canonical

    for _alias in _aliases:
        _ALIAS_TO_CANONICAL[_alias.lower()] = _canonical


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
