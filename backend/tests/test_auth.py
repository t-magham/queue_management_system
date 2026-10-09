from app.dependencies.auth import create_guest_token, verify_guest_token

def test_admin_signup_and_login_success(client):
    signup_data = {
        "email": "doc@clinic.com",
        "password": "Password123!",
        "confirmPassword": "Password123!",
    }
    signup_res = client.post("/auth/signup", json=signup_data)
    assert signup_res.status_code == 200

    login_data = {
        "email": "doc@clinic.com",
        "password": "Password123!",
    }
    login_res = client.post("/auth/login", json=login_data)
    assert login_res.status_code == 200
    body = login_res.json()
    assert "token" in body
    assert body["token_type"] == "bearer"

def test_admin_login_invalid_password(client):
    signup_data = {
        "email": "user@clinic.com",
        "password": "Password123!",
        "confirmPassword": "Password123!",
    }
    client.post("/auth/signup", json=signup_data)

    login_data = {
        "email": "user@clinic.com",
        "password": "WrongPassword!",
    }
    login_res = client.post("/auth/login", json=login_data)
    assert login_res.status_code == 401

def test_admin_signup_duplicate_email(client):
    signup_data = {
        "email": "dup@clinic.com",
        "password": "Password123!",
        "confirmPassword": "Password123!",
    }
    res1 = client.post("/auth/signup", json=signup_data)
    assert res1.status_code == 200

    res2 = client.post("/auth/signup", json=signup_data)
    assert res2.status_code == 409

def test_guest_token_generation_and_verification():
    token = create_guest_token(entry_id=42, queue_id=7, join_number=3)
    assert isinstance(token, str)

    payload = verify_guest_token(token)
    assert payload["sub"] == "guest"
    assert payload["entry_id"] == 42
    assert payload["queue_id"] == 7
    assert payload["join_number"] == 3
