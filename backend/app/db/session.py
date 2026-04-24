from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core import settings

# Engine = manages the connection pool to postgres
engine = create_engine(settings.DATABASE_URL, pool_pre_ping= True)

# SessionLocal = session factory to create db sessions per request
SessionLocal = sessionmaker(autocommit= False, autoflush= False, bind= engine)
