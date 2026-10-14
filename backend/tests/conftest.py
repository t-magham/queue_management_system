import os

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.testclient import TestClient

from app.models.base import Base
import app.models  # ensure models are registered
from app.main import app
from app.db.deps import get_db
import app.api.routes.ws as ws_module

# Default: in-memory SQLite with StaticPool so all threads/sessions share the same memory database.
# Set TEST_DATABASE_URL to a Postgres URL (as CI does) to run against a real database whose
# schema was created by `alembic upgrade head`, so migration/model mismatches show up as failures.
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite:///:memory:")
IS_SQLITE = TEST_DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    if not IS_SQLITE:
        yield  # schema comes from alembic migrations
        return
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    # the websocket endpoint opens its own session; bind it to the same connection
    # so it sees this test's uncommitted data (and gets rolled back with it)
    ws_module.SessionLocal = lambda: TestingSessionLocal(bind=connection)

    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

class ApiTestClient(TestClient):
    def request(self, method, url, *args, **kwargs):
        if isinstance(url, str) and not url.startswith("/api") and url.startswith("/"):
            url = f"/api{url}"
        return super().request(method, url, *args, **kwargs)

    def websocket_connect(self, url, *args, **kwargs):
        if isinstance(url, str) and not url.startswith("/api") and url.startswith("/"):
            url = f"/api{url}"
        return super().websocket_connect(url, *args, **kwargs)

@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with ApiTestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def admin_headers(client):
    # Register admin
    signup_payload = {
        "email": "admin@example.com",
        "password": "Password123!",
        "confirmPassword": "Password123!",
    }
    client.post("/auth/signup", json=signup_payload)
    
    # Login admin
    login_payload = {
        "email": "admin@example.com",
        "password": "Password123!",
    }
    res = client.post("/auth/login", json=login_payload)
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}
