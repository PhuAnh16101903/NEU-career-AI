from typing import List

from app.core.errors import ServiceError
from app.data.skill_taxonomy import (
    category_of,
    extract_skills,
    normalize_skill,
    role_requirements,
)
from app.schemas.analysis import (
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

        return SkillGapResponse(
            overall_match_percentage=match_percentage,
            requirements_source=source,
            required_skills=required,
            matched_skills=matched,
            missing_skills=missing,
            unrecognized_skills=unrecognized,
            radar_chart_data=radar,
            recommended_neu_courses=recommended,
            general_advice=advice,
        )


matching_service = MatchingService()
