from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


# Diese Funktion sucht nach einem Benutzer in der Datenbank anhand der GitHub-ID.
# Wenn der Benutzer existiert, werden seine GitHub-Daten aktualisiert.
# Wenn der Benutzer nicht existiert, wird ein neuer Benutzer erstellt.

def find_or_create_github_user(
    database: Session, # Die SQLAlchemy-Session, die für die Datenbankoperationen verwendet wird.
    github_user: dict[str, Any], # Ein Dictionary, das die GitHub-Benutzerdaten enthält, die von der GitHub-API zurückgegeben werden.
    email: str | None, # Die primäre E-Mail-Adresse des GitHub-Benutzers, die optional ist und von der GitHub-API abgerufen werden kann.
) -> User: # Gibt ein User-Objekt zurück, das entweder den gefundenen oder den neu erstellten Benutzer darstellt.
    github_id = github_user.get("id")
    github_login = github_user.get("login")

    if github_id is None:
        raise ValueError("GitHub-Benutzer besitzt keine ID.")

    if not isinstance(github_login, str) or not github_login:
        raise ValueError("GitHub-Benutzer besitzt keinen Login-Namen.")

# Die GitHub-ID wird in einen String umgewandelt, um sicherzustellen, dass sie korrekt
    github_id_string = str(github_id)

# Die Datenbank wird nach einem Benutzer mit der angegebenen GitHub-ID durchsucht.
    statement = select(User).where(
        User.github_id == github_id_string
    )

# Wenn ein Benutzer mit der angegebenen GitHub-ID gefunden wird, werden seine GitHub-Daten aktualisiert.
    user = database.scalar(statement)

# Wenn kein Benutzer mit der angegebenen GitHub-ID gefunden wird, wird ein neuer Benutzer erstellt und in der Datenbank gespeichert.
    if user is not None:
        # Vorhandene GitHub-Daten aktualisieren.
        user.github_login = github_login
        user.name = github_user.get("name")
        user.avatar_url = github_user.get("avatar_url")

        if email:
            user.email = email

# Die Änderungen werden in der Datenbank gespeichert und das aktualisierte Benutzerobjekt wird zurückgegeben.
        database.commit()
        database.refresh(user)

        return user

# Wenn kein Benutzer mit der angegebenen GitHub-ID gefunden wird, wird ein neuer Benutzer erstellt.
    user = User(
        github_id=github_id_string,
        github_login=github_login,
        email=email,
        name=github_user.get("name"),
        avatar_url=github_user.get("avatar_url"),
    )

# Der neue Benutzer wird in der Datenbank gespeichert und das Benutzerobjekt wird zurückgegeben.
    database.add(user)
    database.commit()
    database.refresh(user)

    return user

    #SELECT user WHERE github_id = ...
     #   ↓
    # gefunden → Daten aktualisieren
   # nicht gefunden → neuen User speichern