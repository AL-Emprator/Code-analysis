from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

# Definiert das UserSession-Modell für die Datenbank,
#  das die Sitzungsinformationen der Benutzer speichert.
class UserSession(Base):
    __tablename__ = "user_sessions" # Der Name der Tabelle in der Datenbank, die die Sitzungsinformationen speichert.

# Die Spalten der Tabelle werden hier definiert,    
# einschließlich der Sitzungs-ID, des Token-Hashes, 
#der Benutzer-ID und des Ablaufdatums.
 
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )
# Der Token-Hash der Sitzung, der eindeutig und indiziert ist.
    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
    )

# Die Benutzer-ID, die auf die Benutzer-Tabelle verweist und nicht null sein darf.

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

# Das Ablaufdatum der Sitzung, das nicht null sein darf.
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

# Die Beziehung zur Benutzer-Tabelle, die es ermöglicht, auf die zugehörigen Benutzerdaten zuzugreifen.
    user = relationship("User")