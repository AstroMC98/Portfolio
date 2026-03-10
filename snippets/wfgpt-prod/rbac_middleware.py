"""
Credit limit enforcement decorator for async API endpoints.

WHAT IT DEMONSTRATES:
  A reusable async Python decorator that enforces per-user monthly credit
  limits before allowing expensive LLM API calls to proceed. Integrates
  with Azure AD auth claims and a CosmosDB-backed role manager.

WHY IT'S INTERESTING:
  Decorators are an elegant solution for cross-cutting concerns like rate
  limiting and access control. The decorator extracts auth_claims from
  the wrapped function's arguments (either positional or keyword),
  making it composable with any authenticated endpoint without requiring
  changes to the endpoint's signature.

NOVELTY:
  The typical approach to credit enforcement is a middleware layer that
  intercepts all requests, or manual checks at the top of each endpoint
  function. Both create coupling between the enforcement logic and the
  endpoint code. The decorator pattern here is composable: adding credit
  enforcement to a new endpoint is a one-line annotation change. The
  implementation resolves auth_claims from either positional or keyword
  arguments using inspect.signature(), which is the non-obvious part —
  it makes the decorator work regardless of how the caller passes the
  claims, preventing silent failures if endpoint signatures evolve.
"""

import logging
from functools import wraps
from typing import Callable

from quart import current_app, jsonify

logger = logging.getLogger(__name__)


def credit_limit_required(f: Callable) -> Callable:
    """
    Async decorator: block the request with HTTP 429 if the user has
    exceeded their monthly credit limit.

    Usage:
        @blueprint.route("/api/chat", methods=["POST"])
        @authenticated               # sets auth_claims
        @credit_limit_required       # checks credit before proceeding
        async def chat(auth_claims: dict):
            ...
    """

    @wraps(f)
    async def decorated_function(*args, **kwargs):
        # Locate auth_claims — supports both positional and keyword passing
        auth_claims = kwargs.get("auth_claims")
        if not auth_claims:
            for arg in args:
                if isinstance(arg, dict) and "oid" in arg:
                    auth_claims = arg
                    break

        if not auth_claims:
            return jsonify({"error": "Authentication required"}), 401

        user_id = auth_claims.get("oid")
        if not user_id:
            return jsonify({"error": "User ID missing from auth claims"}), 401

        # Skip enforcement when usage tracking is disabled (local dev, CI)
        from config import CONFIG_USAGE_TRACKING_ENABLED
        if not current_app.config.get(CONFIG_USAGE_TRACKING_ENABLED, False):
            return await f(*args, **kwargs)

        try:
            from core.role_manager import get_role_manager
            role_manager = get_role_manager()
            if not role_manager:
                # Fail open — usage tracking unavailable, allow the request
                logger.warning("Role manager unavailable; skipping credit check")
                return await f(*args, **kwargs)

            # Bootstrap credit fields on first-ever request for this user
            await role_manager.ensure_user_has_credit_limit(user_id)

            if await role_manager.is_user_over_credit_limit(user_id):
                usage = await role_manager.get_user_usage_against_limit(user_id)
                logger.warning("User %s blocked — credit limit exceeded", user_id)
                return jsonify({
                    "error": "Credit limit exceeded",
                    "message": (
                        "You have exceeded your monthly credit limit. "
                        "Contact your administrator or wait for the monthly reset."
                    ),
                    "error_code": "CREDIT_LIMIT_EXCEEDED",
                    "credit_status": {
                        "credit_limit":       usage.get("credit_limit", 0.0),
                        "current_usage":      usage.get("current_usage", 0.0),
                        "remaining_credit":   usage.get("remaining_credit", 0.0),
                        "usage_percentage":   usage.get("usage_percentage", 0.0),
                        "limit_exceeded":     True,
                    },
                }), 429  # HTTP 429 Too Many Requests

            # Under the limit — proceed to the actual endpoint
            return await f(*args, **kwargs)

        except Exception as exc:
            # Fail open on unexpected errors — never block a user due to our bug
            logger.error("Credit check failed for user %s: %s", user_id, exc)
            return await f(*args, **kwargs)

    return decorated_function
