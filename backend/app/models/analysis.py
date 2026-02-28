from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey, Text, Integer
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    analysis_date = Column(DateTime(timezone=True), nullable=False)

    # Scores
    overall_wellness_score = Column(Float, nullable=True)
    linguistic_score = Column(Float, nullable=True)
    consumption_score = Column(Float, nullable=True)
    behavioral_score = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)

    # Detailed Results
    linguistic_details = Column(JSON, nullable=True)
    consumption_details = Column(JSON, nullable=True)
    behavioral_details = Column(JSON, nullable=True)
    predictions = Column(JSON, nullable=True)
    insights = Column(JSON, nullable=True)
    warnings = Column(JSON, nullable=True)

    # Relationships
    user = relationship("User", back_populates="analyses")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="chat_messages")

class RawData(Base):
    __tablename__ = "raw_data"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    source = Column(String, nullable=False)
    data_type = Column(String, nullable=False)
    raw_content = Column(JSON, nullable=True)
    processed = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())