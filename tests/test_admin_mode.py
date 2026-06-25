from pathlib import Path
import sys

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

import app as app_module

client = TestClient(app_module.app)


def test_login_with_valid_credentials():
    response = client.post(
        "/auth/login",
        json={"username": "teacher", "password": "teacher123"},
    )

    assert response.status_code == 200
    assert "token" in response.json()


def test_signup_requires_teacher_auth():
    response = client.post("/activities/Chess Club/signup?email=test@example.com")

    assert response.status_code == 403
    assert "teacher" in response.json()["detail"].lower()
