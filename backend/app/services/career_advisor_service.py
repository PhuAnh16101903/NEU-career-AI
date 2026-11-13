import json

from pydantic import ValidationError

from app.core.errors import LLMError
from app.core.llm import gemini_service
from app.core.prompts import render_prompt

import logging
from typing import Any, Dict, List

from app.data.skill_taxonomy import (
    ROLE_PRESETS,
    extract_skills,
    normalize_skill,
)
from app.schemas.career import (
    CareerAdvisorRequest,
    CareerAdvisorResponse,
    CareerRecommendation,
)
from app.services.curriculum_service import curriculum_service


logger = logging.getLogger(__name__)


class CareerAdvisorService:

    @staticmethod
    def _normalize_candidate_skills(raw_skills: List[str]) -> List[str]:
        """Chuẩn hóa kỹ năng đầu vào theo Skill Taxonomy."""

        candidate = set()

        for raw in raw_skills:
            canonical = normalize_skill(raw)

            if canonical:
                candidate.add(canonical)
            elif raw.strip():
                candidate.update(extract_skills(raw))

        return sorted(candidate)

    @staticmethod
    def _calculate_career_matches(
        candidate_skills: List[str],
    ) -> List[Dict[str, Any]]:
        """Tính điểm phù hợp với từng nhóm nghề nghiệp."""

        candidate = set(candidate_skills)
        results = []

        for keywords, required_skills in ROLE_PRESETS:
            matched = [
                skill for skill in required_skills
                if skill in candidate
            ]

            missing = [
                skill for skill in required_skills
                if skill not in candidate
            ]

            percentage = round(
                len(matched) / len(required_skills) * 100, 1
            )

            results.append({
                "job_title": keywords[0],
                "match_percentage": percentage,
                "matched_skills": matched,
                "missing_skills": missing,
                "required_skills": required_skills,
            })

        results.sort(
            key=lambda item: item["match_percentage"],
            reverse=True,
        )

        return results

    @staticmethod
    def _recommend_courses(
        missing_skills: List[str],
    ) -> List[str]:
        """Lấy danh sách môn học bổ trợ kỹ năng còn thiếu."""

        courses = curriculum_service.find_courses_for_skills(
            missing_skills
        )

        return [
            course.code
            for course, covered in courses
            if covered
        ]

    @staticmethod
    def _build_recommendations(
        matches: List[Dict[str, Any]],
    ) -> List[CareerRecommendation]:
        """Chuyển kết quả tính toán thành danh sách nghề nghiệp đề xuất."""

        recommendations = []

        for item in matches[:3]:
            matched = item["matched_skills"]
            missing = item["missing_skills"]

            if matched:
                reason = (
                    f"Bạn đã có {len(matched)}/{len(item['required_skills'])} "
                    f"kỹ năng thuộc nhóm nghề này, tương ứng "
                    f"{item['match_percentage']}%."
                )
            else:
                reason = (
                    "Chưa ghi nhận kỹ năng phù hợp trong dữ liệu đầu vào. "
                    "Bạn có thể tìm hiểu lĩnh vực này nếu có hứng thú."
                )

            recommendations.append(
                CareerRecommendation(
                    job_title=item["job_title"],
                    suitability_reason=reason,
                    required_skills=item["required_skills"],
                    skills_to_develop=missing,
                )
            )

        return recommendations

    @staticmethod
    def _build_career_profile(
        candidate_skills: List[str],
        request: CareerAdvisorRequest,
    ) -> str:
        """Tạo mô tả hồ sơ năng lực ban đầu."""

        if candidate_skills:
            skills_text = ", ".join(candidate_skills)
        else:
            skills_text = "Chưa cung cấp kỹ năng"

        parts = [f"Kỹ năng hiện có: {skills_text}."]

        if request.major:
            parts.append(f"Ngành học: {request.major}.")

        if request.study_year:
            parts.append(f"Năm học: {request.study_year}.")

        if request.interests:
            parts.append(
                f"Lĩnh vực quan tâm: {', '.join(request.interests)}."
            )

        if request.career_goals:
            parts.append(f"Mục tiêu nghề nghiệp: {request.career_goals}.")

        if request.education:
            parts.append(
                f"Học vấn: {'; '.join(request.education)}."
            )

        if request.experiences:
            parts.append(
                f"Kinh nghiệm và dự án: {'; '.join(request.experiences)}."
            )

        return " ".join(parts)

    @staticmethod
    def _build_fallback_response(
        request: CareerAdvisorRequest,
        candidate_skills: List[str],
        matches: List[Dict[str, Any]],
    ) -> CareerAdvisorResponse:
        """Tạo kết quả tư vấn cơ bản khi chưa gọi được Gemini."""

        recommendations = CareerAdvisorService._build_recommendations(
            matches
        )

        all_missing = list(dict.fromkeys(
            skill
            for item in matches[:3]
            for skill in item["missing_skills"]
        ))

        courses = CareerAdvisorService._recommend_courses(
            all_missing
        )

        profile = CareerAdvisorService._build_career_profile(
            candidate_skills,
            request,
        )

        return CareerAdvisorResponse(
            career_profile=profile,
            career_recommendations=recommendations,
            skill_development=all_missing,
            learning_roadmap=[
                "Tìm hiểu công việc thực tế của các vị trí được đề xuất.",
                "Ưu tiên học những kỹ năng còn thiếu quan trọng.",
                "Thực hành qua dự án cá nhân hoặc dự án nhóm.",
                "Hoàn thiện CV và xây dựng sản phẩm minh chứng năng lực.",
            ],
            recommended_courses=courses,
            general_advice=(
                "Đây là kết quả định hướng sơ bộ dựa trên Skill Taxonomy "
                "và bộ yêu cầu nghề nghiệp mẫu. Hãy kết hợp sở thích, "
                "trải nghiệm thực tế và tìm hiểu yêu cầu tuyển dụng "
                "trước khi lựa chọn hướng đi."
            ),
            is_mock=True,
        )

    @staticmethod
    def _build_ai_prompt(
        request: CareerAdvisorRequest,
        candidate_skills: List[str],
        matches: List[Dict[str, Any]],
    ) -> str:
        """Xây dựng prompt gửi Gemini."""

        available_courses = curriculum_service.find_courses_for_skills(
            list(dict.fromkeys(
                skill
                for item in matches[:3]
                for skill in item["missing_skills"]
            ))
        )

        course_data = [
            {
                "code": course.code,
                "name": course.name,
                "covered_skills": covered,
            }
            for course, covered in available_courses
            if covered
        ]

        return render_prompt(
            "career_advisor",
            career_profile=CareerAdvisorService._build_career_profile(
                candidate_skills, request
            ),
            candidate_skills=json.dumps(
                candidate_skills, ensure_ascii=False
            ),
            career_matches=json.dumps(
                matches[:3], ensure_ascii=False
            ),
            available_courses=json.dumps(
                course_data, ensure_ascii=False
            ),
        )

    @staticmethod
    async def _generate_ai_advice(
        prompt: str,
    ) -> Dict[str, Any]:
        """Gọi Gemini để tạo nội dung tư vấn nghề nghiệp."""

        result = await gemini_service.generate_json(prompt)

        if not isinstance(result, dict):
            raise LLMError("Gemini trả về dữ liệu không đúng định dạng JSON.")

        required_fields = [
            "career_profile",
            "career_recommendations",
            "skill_development",
            "learning_roadmap",
            "recommended_courses",
            "general_advice",
        ]

        missing_fields = [
            field for field in required_fields
            if field not in result
        ]

        if missing_fields:
            raise LLMError(
                f"Gemini thiếu trường dữ liệu: {', '.join(missing_fields)}"
            )

        return result

    @staticmethod
    def _merge_ai_advice(
        request: CareerAdvisorRequest,
        candidate_skills: List[str],
        matches: List[Dict[str, Any]],
        ai_data: Dict[str, Any],
    ) -> CareerAdvisorResponse:
        """Kết hợp tư vấn Gemini với kết quả tính toán của Python."""

        deterministic_recommendations = (
            CareerAdvisorService._build_recommendations(matches)
        )

        ai_reasons = {}

        for item in ai_data["career_recommendations"]:
            if not isinstance(item, dict):
                continue

            title = item.get("job_title")
            reason = item.get("suitability_reason")

            if isinstance(title, str) and isinstance(reason, str):
                ai_reasons[title] = reason

        recommendations = []

        for recommendation in deterministic_recommendations:
            reason = ai_reasons.get(
                recommendation.job_title,
                recommendation.suitability_reason,
            )

            recommendations.append(
                recommendation.model_copy(
                    update={"suitability_reason": reason}
                )
            )

        allowed_courses = set(
            CareerAdvisorService._recommend_courses(
                list(dict.fromkeys(
                    skill
                    for item in matches[:3]
                    for skill in item["missing_skills"]
                ))
            )
        )

        ai_courses = ai_data["recommended_courses"]

        if not isinstance(ai_courses, list):
            ai_courses = []

        recommended_courses = [
            code for code in ai_courses
            if isinstance(code, str) and code in allowed_courses
        ]

        return CareerAdvisorResponse(
            career_profile=CareerAdvisorService._build_career_profile(
                candidate_skills, request
            ),
            career_recommendations=recommendations,
            skill_development=[
                skill for skill in ai_data["skill_development"]
                if isinstance(skill, str)
            ] if isinstance(ai_data["skill_development"], list) else [],
            learning_roadmap=[
                step for step in ai_data["learning_roadmap"]
                if isinstance(step, str)
            ] if isinstance(ai_data["learning_roadmap"], list) else [],
            recommended_courses=list(dict.fromkeys(recommended_courses)),
            general_advice=(
                ai_data["general_advice"]
                if isinstance(ai_data["general_advice"], str)
                else "Hãy tiếp tục phát triển kỹ năng qua học tập và dự án thực tế."
            ),
            is_mock=False,
        )

    async def advise(
        self,
        request: CareerAdvisorRequest,
    ) -> CareerAdvisorResponse:
        """Thực hiện tư vấn định hướng nghề nghiệp."""

        candidate_skills = self._normalize_candidate_skills(
            request.skills
        )

        matches = self._calculate_career_matches(
            candidate_skills
        )

        fallback = self._build_fallback_response(
            request,
            candidate_skills,
            matches,
        )

        if not gemini_service.is_configured:
            logger.warning(
                "Gemini chưa được cấu hình. Sử dụng fallback."
            )
            return fallback

        try:
            prompt = self._build_ai_prompt(
                request,
                candidate_skills,
                matches,
            )

            ai_data = await self._generate_ai_advice(prompt)

            return self._merge_ai_advice(
                request,
                candidate_skills,
                matches,
                ai_data,
            )

        except (LLMError, ValidationError, ValueError, TypeError):
            logger.exception(
                "Career Advisor thất bại. Sử dụng fallback."
            )
            return fallback


career_advisor_service = CareerAdvisorService()