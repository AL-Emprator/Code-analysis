from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# Definiert das User-Modell für die Datenbank, 
#das die GitHub-Benutzerinformationen speichert.
class User(Base):
    __tablename__ = "users" # Der Name der Tabelle in der Datenbank, die die Benutzerdaten speichert.

 # Die Spalten der Tabelle werden hier definiert, 
 # einschließlich der GitHub-ID, des Logins, der E-Mail, des Namens, der Avatar-URL und des Erstellungsdatums.
    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

# Die GitHub-ID des Benutzers, die eindeutig und indiziert ist, um schnelle Abfragen zu ermöglichen.
    github_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )

# Der GitHub-Login des Benutzers, der nicht null sein darf.
    github_login: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

# Die E-Mail-Adresse des Benutzers, die optional ist, aber eindeutig und indiziert sein sollte.
    email: Mapped[str | None] = mapped_column(
        String(320),
        unique=True,
        index=True,
        nullable=True,
    )
 

# Der Name des Benutzers, der optional ist.
    name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

#   Die URL des Avatars des Benutzers, die optional ist und bis zu 1000 Zeichen lang sein kann.
    avatar_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )