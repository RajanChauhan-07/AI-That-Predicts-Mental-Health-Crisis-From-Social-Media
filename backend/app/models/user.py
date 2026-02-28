from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, Float, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    picture = Column(String, nullable=True)
    google_id = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Connected sources
    spotify_connected = Column(Boolean, default=False)
    spotify_token = Column(Text, nullable=True)
    google_fit_connected = Column(Boolean, default=False)
    google_fit_token = Column(Text, nullable=True)
    notion_connected = Column(Boolean, default=False)
    notion_token = Column(Text, nullable=True)

    # Relationships
    analyses = relationship("Analysis", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="user")