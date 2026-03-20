from fastapi import Header, HTTPException, Query, status
import jwt

from app.config import settings
from app.schemas import AuthContext


async def get_auth_context(
    authorization: str | None = Header(default=None, alias="Authorization"),
    access_token: str | None = Query(default=None),
    x_dev_user_id: str | None = Header(default=None, alias="X-Dev-User-Id"),
    x_dev_user_email: str | None = Header(default=None, alias="X-Dev-User-Email"),
    x_dev_user_name: str | None = Header(default=None, alias="X-Dev-User-Name"),
) -> AuthContext:
    bearer_token = None
    if authorization and authorization.startswith("Bearer "):
        bearer_token = authorization.removeprefix("Bearer ").strip()
    elif access_token:
        bearer_token = access_token.strip()

    if bearer_token and settings.supabase_jwt_secret:
        try:
            payload = jwt.decode(
                bearer_token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience=settings.supabase_jwt_audience,
                options={"verify_aud": bool(settings.supabase_jwt_audience)},
            )
        except jwt.PyJWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token.") from exc

        auth_subject = str(payload.get("sub") or payload.get("user_id") or "")
        if not auth_subject:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token missing subject.")

        email = payload.get("email")
        display_name = payload.get("user_metadata", {}).get("full_name") if isinstance(payload.get("user_metadata"), dict) else None
        return AuthContext(auth_subject=auth_subject, email=email, display_name=display_name)

    if settings.allow_insecure_dev_auth:
        return AuthContext(
            auth_subject=x_dev_user_id or settings.default_dev_user_id,
            email=x_dev_user_email or settings.default_dev_user_email,
            display_name=x_dev_user_name,
        )

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
