import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.session import UserSession

from sqlalchemy import select

SESSION_DURATION_DAYS = 7

# Die Funktion hash_session_token nimmt einen Token-String als 
#Eingabe und gibt den SHA-256-Hash des Tokens zurück.
def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

# Die Funktion create_user_session erstellt eine neue Benutzersitzung in der Datenbank.
# Sie nimmt eine SQLAlchemy-Session und die Benutzer-ID als Eingabe und gibt ein Tupel zurück, 
#das den rohen Token und das UserSession-Objekt enthält.


def get_user_from_session_token(
    database: Session,
    raw_token: str,
):
    token_hash = hash_session_token(raw_token)

    statement = select(UserSession).where(
        UserSession.token_hash == token_hash
    )

    user_session = database.scalar(statement)

    if user_session is None:
        return None

    expires_at = user_session.expires_at

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= datetime.now(timezone.utc):
        database.delete(user_session)
        database.commit()
        return None

    return user_session.user


def create_user_session(
    database: Session,
    user_id: int,
) -> tuple[str, UserSession]:
    raw_token = secrets.token_urlsafe(48)
    token_hash = hash_session_token(raw_token)

    expires_at = datetime.now(timezone.utc) + timedelta(
        days=SESSION_DURATION_DAYS
    )

#  Ein neues UserSession-Objekt wird erstellt, das den Token-Hash, die Benutzer-ID und das Ablaufdatum enthält.
    user_session = UserSession(
        token_hash=token_hash,
        user_id=user_id,
        expires_at=expires_at,
    )

# Der neue UserSession-Eintrag wird in der Datenbank gespeichert und das Tupel mit dem rohen Token und dem UserSession-Objekt wird zurückgegeben.
    database.add(user_session)
    database.commit()
    database.refresh(user_session)

    return raw_token, user_session