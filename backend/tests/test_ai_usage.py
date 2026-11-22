from unittest.mock import patch
from datetime import datetime, timezone

from app.core.security import create_access_token
from app.models import User
from app.models import AIUsageLog
from app.services.ai_usage_service import log_ai_usage

import pytest

from app.core.database import SessionLocal


def test_log_ai_usage_saves_model_and_tokens(client):
    log_ai_usage(
        model="gemini-3.5-flash-lite",
        feature="cv",
        status="success",
        prompt_tokens=100,
        completion_tokens=50,
        total_tokens=150,
        latency_ms=1200,
    )

    from app.core.database import SessionLocal

    with SessionLocal() as db:
        usage = (
            db.query(AIUsageLog)
            .filter(AIUsageLog.feature == "cv")
            .order_by(AIUsageLog.created_at.desc())
            .first()
        )

        assert usage is not None
        assert usage.model == "gemini-3.5-flash-lite"
        assert usage.status == "success"
        assert usage.prompt_tokens == 100
        assert usage.completion_tokens == 50
        assert usage.total_tokens == 150


def test_log_ai_usage_does_not_raise_when_database_fails():
    with patch(
        "app.services.ai_usage_service.SessionLocal",
        side_effect=Exception("Database unavailable"),
    ):
        # Không được phát sinh exception ra ngoài.
        log_ai_usage(
            model="gemini-3.5-flash-lite",
            feature="cv",
            status="failed",
            error_type="LLMError",
        )


def _clear_ai_usage_logs():
    """Chỉ xóa log AI trong database test tạm."""
    with SessionLocal() as db:
        db.query(AIUsageLog).delete()
        db.commit()


def _admin_headers(client):
    """Đăng nhập bằng tài khoản Admin mẫu và lấy Bearer Token."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "admin@neu.edu.vn",
            "password": "123456",
        },
    )
    assert response.status_code == 200, response.text

    return {
        "Authorization": f"Bearer {response.json()['access_token']}"
    }


def test_admin_ai_usage_stats(client):
    _clear_ai_usage_logs()
    headers = _admin_headers(client)

    log_ai_usage(
        model="test-model-1",
        feature="stats_test",
        status="success",
        prompt_tokens=100,
        completion_tokens=50,
        total_tokens=150,
        latency_ms=100,
    )

    log_ai_usage(
        model="test-model-2",
        feature="stats_test",
        status="success",
        prompt_tokens=200,
        completion_tokens=100,
        total_tokens=300,
        latency_ms=300,
    )

    log_ai_usage(
        model="test-model-3",
        feature="stats_test",
        status="failed",
        prompt_tokens=50,
        completion_tokens=0,
        total_tokens=50,
        error_type="LLMError",
    )

    response = client.get(
        "/api/admin/ai-usage/stats",
        headers=headers,
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert data["total_requests"] == 3
    assert data["successful_requests"] == 2
    assert data["failed_requests"] == 1
    assert data["success_rate"] == 66.67

    assert data["prompt_tokens"] == 350
    assert data["completion_tokens"] == 150
    assert data["total_tokens"] == 500

    assert data["average_latency_ms"] == 200
    assert data["estimated_cost_usd"] is None


def test_admin_ai_usage_by_feature(client):
    _clear_ai_usage_logs()
    headers = _admin_headers(client)

    log_ai_usage(
        model="test-model",
        feature="feature_alpha",
        status="success",
        prompt_tokens=100,
        completion_tokens=50,
        total_tokens=150,
        latency_ms=100,
    )

    log_ai_usage(
        model="test-model",
        feature="feature_alpha",
        status="failed",
        prompt_tokens=50,
        completion_tokens=0,
        total_tokens=50,
        latency_ms=200,
        error_type="LLMError",
    )

    log_ai_usage(
        model="test-model",
        feature="feature_beta",
        status="success",
        prompt_tokens=200,
        completion_tokens=100,
        total_tokens=300,
        latency_ms=300,
    )

    response = client.get(
        "/api/admin/ai-usage/by-feature",
        headers=headers,
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert len(data) == 2

    alpha = next(item for item in data if item["feature"] == "feature_alpha")
    beta = next(item for item in data if item["feature"] == "feature_beta")

    assert alpha["total_requests"] == 2
    assert alpha["successful_requests"] == 1
    assert alpha["failed_requests"] == 1
    assert alpha["total_tokens"] == 200
    assert alpha["average_latency_ms"] == 150

    assert beta["total_requests"] == 1
    assert beta["successful_requests"] == 1
    assert beta["failed_requests"] == 0
    assert beta["total_tokens"] == 300
    assert beta["average_latency_ms"] == 300


def test_admin_ai_usage_logs_filter_and_pagination(client):
    _clear_ai_usage_logs()
    headers = _admin_headers(client)

    log_ai_usage(
        model="pagination-model-1",
        feature="pagination_test",
        status="success",
        prompt_tokens=100,
        completion_tokens=50,
        total_tokens=150,
        latency_ms=100,
    )

    log_ai_usage(
        model="pagination-model-2",
        feature="pagination_test",
        status="failed",
        prompt_tokens=50,
        completion_tokens=0,
        total_tokens=50,
        error_type="LLMError",
    )

    log_ai_usage(
        model="pagination-model-3",
        feature="pagination_test",
        status="success",
        prompt_tokens=200,
        completion_tokens=100,
        total_tokens=300,
        latency_ms=300,
    )

    # 1. Lấy trang đầu tiên, mỗi trang một bản ghi.
    page_1 = client.get(
        "/api/admin/ai-usage/logs",
        headers=headers,
        params={
            "page": 1,
            "page_size": 1,
            "feature": "pagination_test",
        },
    )

    assert page_1.status_code == 200, page_1.text

    data_1 = page_1.json()

    assert data_1["total"] == 3
    assert data_1["page"] == 1
    assert data_1["page_size"] == 1
    assert len(data_1["items"]) == 1

    # 2. Lấy trang thứ hai.
    page_2 = client.get(
        "/api/admin/ai-usage/logs",
        headers=headers,
        params={
            "page": 2,
            "page_size": 1,
            "feature": "pagination_test",
        },
    )

    assert page_2.status_code == 200, page_2.text

    data_2 = page_2.json()

    assert data_2["total"] == 3
    assert data_2["page"] == 2
    assert len(data_2["items"]) == 1

    # Hai trang không được trả về cùng một bản ghi.
    assert data_1["items"][0]["id"] != data_2["items"][0]["id"]

    # 3. Lọc riêng các bản ghi thành công.
    success_logs = client.get(
        "/api/admin/ai-usage/logs",
        headers=headers,
        params={
            "feature": "pagination_test",
            "status": "success",
        },
    )

    assert success_logs.status_code == 200, success_logs.text

    success_data = success_logs.json()

    assert success_data["total"] == 2
    assert all(item["status"] == "success" for item in success_data["items"])

    # 4. Lọc riêng bản ghi thất bại.
    failed_logs = client.get(
        "/api/admin/ai-usage/logs",
        headers=headers,
        params={
            "feature": "pagination_test",
            "status": "failed",
        },
    )

    assert failed_logs.status_code == 200, failed_logs.text

    failed_data = failed_logs.json()

    assert failed_data["total"] == 1
    assert failed_data["items"][0]["status"] == "failed"
    assert failed_data["items"][0]["error_type"] == "LLMError"

    # 5. Kiểm tra các trường của một log.
    item = failed_data["items"][0]

    assert item["provider"] == "gemini"
    assert item["model"] == "pagination-model-2"
    assert item["feature"] == "pagination_test"
    assert item["prompt_tokens"] == 50
    assert item["completion_tokens"] == 0
    assert item["total_tokens"] == 50
    assert item["created_at"]


@pytest.mark.parametrize(
    "endpoint",
    [
        "/api/admin/ai-usage/stats",
        "/api/admin/ai-usage/by-feature",
        "/api/admin/ai-usage/logs",
    ],
)
def test_admin_ai_usage_endpoints_require_admin(client, endpoint):
    # Chưa đăng nhập -> 401.
    unauthenticated = client.get(endpoint)
    assert unauthenticated.status_code == 401

    # Sinh viên -> 403.
    student_login = client.post(
        "/api/auth/login",
        json={
            "email": "phu@st.neu.edu.vn",
            "password": "123456",
        },
    )

    assert student_login.status_code == 200

    student_headers = {
        "Authorization": f"Bearer {student_login.json()['access_token']}"
    }

    student_response = client.get(
        endpoint,
        headers=student_headers,
    )

    assert student_response.status_code == 403

    # Admin -> 200.
    admin_headers = _admin_headers(client)

    admin_response = client.get(
        endpoint,
        headers=admin_headers,
    )

    assert admin_response.status_code == 200, admin_response.text