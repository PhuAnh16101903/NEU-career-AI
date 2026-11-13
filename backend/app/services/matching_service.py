import logging
from typing import Any, Dict, List

from pydantic import ValidationError

from app.core.errors import LLMError, ServiceError
from app.core.llm import gemini_service
from app.core.prompts import render_prompt
from app.data.skill_taxonomy import (
    category_of,
    extract_skills,
    normalize_skill,
    role_requirements,
)
from app.schemas.analysis import (
    CourseExplanation,
    RadarSkillCategory,
    RecommendedCourse,
    SkillGapRequest,
    SkillGapResponse,
)
from app.services.curriculum_service import curriculum_service


class MatchingService:
    @staticmethod
    def _resolve_requirements(request: SkillGapRequest):
        """Yêu cầu lấy từ JD nếu có và nhận diện được kỹ năng, nếu không thì theo bộ mặc định của vị trí."""
        if request.target_job_description:
            from_jd = extract_skills(request.target_job_description)
            if from_jd:
                return from_jd, "job_description"
        preset = role_requirements(request.job_title)
        if preset:
            return preset, "role_preset"
        raise ServiceError(
            422,
            "Không xác định được kỹ năng yêu cầu: JD không chứa kỹ năng nào trong Skill Taxonomy "
            "và vị trí chưa có bộ yêu cầu mặc định. Hãy bổ sung nội dung JD.",
        )

    @staticmethod
    async def _generate_ai_advice(
        request: SkillGapRequest,
        required: List[str],
        matched: List[str],
        missing: List[str],
        unrecognized: List[str],
        match_percentage: float,
        source: str,
        recommended: List[RecommendedCourse],
    ) -> Dict[str, Any]:
        """Gọi Gemini để tạo tư vấn dựa trên kết quả Matching đã tính."""

        recommended_data = [
            {
                "course_code": course.course_code,
                "course_name": course.course_name,
                "department": course.department,
                "credits": course.credits,
                "skills_covered": course.skills_covered,
            }
            for course in recommended
        ]

        prompt = render_prompt(
            "skill_gap_analysis",
            job_title=request.job_title,
            requirements_source=source,
            required_skills=required,
            matched_skills=matched,
            missing_skills=missing,
            unrecognized_skills=unrecognized,
            match_percentage=match_percentage,
            recommended_courses=recommended_data,
            job_description=request.target_job_description or "Không cung cấp JD.",
        )

        result = await gemini_service.generate_json(prompt)

        if not isinstance(result, dict):
            raise LLMError("Gemini không trả về JSON object hợp lệ.")

        try:
            skill_gap_analysis = result.get("skill_gap_analysis", "")
            learning_roadmap = result.get("learning_roadmap", [])
            general_advice = result.get("general_advice", "")
            raw_courses = result.get("course_explanations", [])

            if not isinstance(skill_gap_analysis, str):
                raise ValueError("skill_gap_analysis phải là chuỗi")

            if not isinstance(learning_roadmap, list) or not all(
                isinstance(item, str) for item in learning_roadmap
            ):
                raise ValueError("learning_roadmap phải là danh sách chuỗi")

            if not isinstance(general_advice, str):
                raise ValueError("general_advice phải là chuỗi")

            if not isinstance(raw_courses, list):
                raise ValueError("course_explanations phải là danh sách")

            course_explanations = [
                CourseExplanation.model_validate(item)
                for item in raw_courses
            ]

            allowed_codes = {course.course_code for course in recommended}
            course_explanations = [
                item for item in course_explanations
                if item.course_code in allowed_codes
            ]

            return {
                "skill_gap_analysis": skill_gap_analysis,
                "learning_roadmap": learning_roadmap,
                "course_explanations": course_explanations,
                "general_advice": general_advice,
            }

        except (ValidationError, TypeError, ValueError) as exc:
            raise LLMError(
                f"Dữ liệu tư vấn Matching từ Gemini không hợp lệ: {exc}"
            ) from exc

    @staticmethod
    async def analyze_skill_gap(request: SkillGapRequest) -> SkillGapResponse:
        required, source = MatchingService._resolve_requirements(request)

        candidate = set()
        unrecognized: List[str] = []
        for raw in request.candidate_skills:
            canonical = normalize_skill(raw)
            if canonical:
                candidate.add(canonical)
            elif raw.strip():
                # Cho phép nhập cả cụm dài ("thành thạo SQL và Power BI") bằng cách quét lại taxonomy.
                found = extract_skills(raw)
                if found:
                    candidate.update(found)
                else:
                    unrecognized.append(raw.strip())

        matched = [s for s in required if s in candidate]
        missing = [s for s in required if s not in candidate]
        match_percentage = round(len(matched) / len(required) * 100, 1)

        # Radar: mỗi nhóm kỹ năng có trong yêu cầu là một trục.
        radar = []
        for category in dict.fromkeys(category_of(s) for s in required):
            in_category = [s for s in required if category_of(s) == category]
            got = sum(1 for s in in_category if s in candidate)
            radar.append(
                RadarSkillCategory(
                    category_name=category,
                    candidate_score=round(got / len(in_category) * 100),
                    job_requirement_score=100,
                )
            )

        recommended = [
            RecommendedCourse(
                course_code=course.code,
                course_name=course.name,
                department=course.major,
                credits=course.credits,
                skills_covered=covered,
                reason=f"Bù kỹ năng còn thiếu: {', '.join(covered)}",
            )
            for course, covered in curriculum_service.find_courses_for_skills(missing)
        ]

        if missing:
            advice = (
                f"Bạn đáp ứng {match_percentage}% yêu cầu của vị trí {request.job_title}. "
                f"Còn thiếu: {', '.join(missing)}."
            )
            if recommended:
                advice += f" Có {len(recommended)} môn học tại NEU giúp bù các kỹ năng này."
            else:
                advice += " Chưa có môn học trong danh mục phù hợp, hãy tìm khóa học ngoài."
        else:
            advice = f"Bạn đáp ứng đủ các kỹ năng yêu cầu của vị trí {request.job_title}."

        # Gemini chỉ bổ sung phần tư vấn, không can thiệp kết quả Matching.
        ai_advice = {
            "skill_gap_analysis": "",
            "learning_roadmap": [],
            "course_explanations": [],
            "general_advice": advice,
        }

        try:
            ai_advice = await MatchingService._generate_ai_advice(
                request=request,
                required=required,
                matched=matched,
                missing=missing,
                unrecognized=unrecognized,
                match_percentage=match_percentage,
                source=source,
                recommended=recommended,
            )
            if not ai_advice["general_advice"]:
                ai_advice["general_advice"] = advice

        except LLMError as exc:
            # Gemini lỗi hoặc chưa cấu hình: giữ tư vấn dự phòng.
            logger = logging.getLogger(__name__)
            logger.warning(
                "Matching Gemini thất bại, sử dụng tư vấn dự phòng: %s",
                exc,
            )

        return SkillGapResponse(
            overall_match_percentage=match_percentage,
            requirements_source=source,
            required_skills=required,
            matched_skills=matched,
            missing_skills=missing,
            unrecognized_skills=unrecognized,
            radar_chart_data=radar,
            recommended_neu_courses=recommended,
            general_advice=ai_advice["general_advice"],
            skill_gap_analysis=ai_advice["skill_gap_analysis"],
            learning_roadmap=ai_advice["learning_roadmap"],
            course_explanations=ai_advice["course_explanations"],
        )


matching_service = MatchingService()
