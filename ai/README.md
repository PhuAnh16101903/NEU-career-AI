# AI Prompts & Dữ liệu Học phần NEU (`ai/`)

Thư mục này chứa các **Prompt Templates** và tài liệu hướng dẫn tích hợp AI/Data với hệ thống Backend (`backend/`).

---

## Định hướng công việc theo từng nhánh (Branches)

### 1. Nhánh `feat/cv-parser` — Bóc tách CV bằng LLM
- **File cần làm việc:**
  1. [`ai/prompts/cv_extraction.txt`](./prompts/cv_extraction.txt): Hoàn thiện prompt hướng dẫn Gemini bóc tách thông tin ứng viên theo chuẩn JSON (`CVExtractionResponse`).
  2. [`backend/app/services/cv_service.py`](../backend/app/services/cv_service.py): Tìm vị trí đánh dấu `TODO (nhóm AI)` trong hàm `parse_cv`, gọi `render_prompt("cv_extraction", raw_cv_text=text)` và `gemini_service.generate_json(prompt)` để lấy thêm danh sách `education` và `experiences`.

### 2. Nhánh `feat/matching-engine` — Phân tích Khoảng cách Kỹ năng (Skill Gap)
- **File cần làm việc:**
  1. [`ai/prompts/skill_gap_analysis.txt`](./prompts/skill_gap_analysis.txt): Hoàn thiện prompt so sánh kỹ năng ứng viên với JD mục tiêu.
  2. [`backend/app/services/matching_service.py`](../backend/app/services/matching_service.py): Trong hàm `analyze_skill_gap`, kết hợp lời khuyên cá nhân hóa từ LLM vào trường `general_advice` trong `SkillGapResponse`.

### 3. Nhánh `feat/mock-interview` — Phỏng vấn thử theo mô hình STAR
- **File cần làm việc:**
  1. [`ai/prompts/star_interview_agent.txt`](./prompts/star_interview_agent.txt): Hoàn thiện rubric chấm điểm `situation_score`, `task_score`, `action_score`, `result_score` (thang 0–10) và sinh câu hỏi tiếp theo (`interviewer_reply`).
  2. [`backend/app/services/interview_service.py`](../backend/app/services/interview_service.py): Tìm vị trí `TODO (nhóm AI)` trong hàm `evaluate_star` và `handle_chat`, thay thế/bổ sung bộ chấm điểm heuristic bằng kết quả JSON từ Gemini.

### 4. Nhánh `feat/curriculum-data` — Dữ liệu Học phần & Chuẩn đầu ra NEU
- **File cần làm việc:**
  1. [`backend/app/services/curriculum_service.py`](../backend/app/services/curriculum_service.py): Mở rộng danh mục `SAMPLE_NEU_COURSES` với các học phần thực tế tại ĐH Kinh tế Quốc dân (MIS, Khoa học dữ liệu, Kinh tế số, Marketing số, Kiểm toán...).
  2. [`backend/app/data/skill_taxonomy.py`](../backend/app/data/skill_taxonomy.py): Bổ sung các kỹ năng chuẩn (`SKILLS`) và từ đồng nghĩa tương ứng với chuẩn đầu ra học phần.

---

## Cách sử dụng hàm tiện ích có sẵn từ Backend

Backend đã xây dựng sẵn bộ nạp prompt và gọi Gemini JSON tại `backend/app/core/`:

```python
from app.core.prompts import render_prompt
from app.core.llm import gemini_service

# 1. Nạp file .txt trong ai/prompts/ và điền biến {{...}}
prompt = render_prompt("cv_extraction", raw_cv_text=text)

# 2. Gọi Gemini trả về dict JSON đã parse
result = await gemini_service.generate_json(prompt)
```
