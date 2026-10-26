"""
JWT session manager with token-bounded conversation history.

WHAT IT DEMONSTRATES:
  Stateless session management for a multi-user RAG chatbot: JWT tokens
  carry identity without server-side session store, a server-side TTL cache
  provides expiry enforcement independent of token expiry, and conversation
  history is kept within a hard token budget to prevent context window
  overflow on long sessions.

WHY IT'S INTERESTING:
  Long RAG conversations silently break when history grows past the model's
  context window — the LLM truncates from the wrong end, losing the question
  rather than old context. The token-bounded history here trims from the
  oldest messages first, always preserving the current query. JWT alone
  isn't sufficient for a chatbot session because tokens are valid until
  expiry even after a user logs out; the server-side TTL provides a
  revocable inactivity timeout without a database.

NOVELTY:
  Most JWT implementations treat the token as the only session record.
  Here the JWT validates identity while a lightweight in-process TTL cache
  (not Redis, not a DB) handles per-session inactivity timeout independently.
  This avoids the ops overhead of a session store for a system where sessions
  are short-lived and losing a session on server restart is acceptable.
  The token budget enforcer uses a character-based approximation (4 chars ≈
  1 token) rather than a full tokeniser — accurate enough for budget enforcement
  and avoids adding tiktoken as a hard dependency. When the exact limit matters
  (context window boundary), the LLM API will enforce it anyway; the budget here
  is a conservative pre-flight guard, not a precision counter.
"""

from __future__ import annotations

import time
import uuid
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Optional

import jwt


# ── Data structures ────────────────────────────────────────────────────────

@dataclass
class SessionData:
    user_id: str
    session_id: str
    created_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)
    conversation_history: list[dict] = field(default_factory=list)


# ── Session Manager ────────────────────────────────────────────────────────

class SessionManager:
    """
    Manages authenticated user sessions for a multi-user RAG chatbot.

    Responsibilities:
      1. JWT validation — verify token signature and claims
      2. Inactivity TTL — expire sessions idle beyond `session_ttl_seconds`
      3. History management — append turns and trim to token budget
    """

    CHARS_PER_TOKEN = 4          # ~1 token ≈ 4 chars (GPT tokeniser approximation)

    def __init__(
        self,
        jwt_secret: str,
        jwt_algorithm: str = "HS256",
        session_ttl_seconds: int = 1800,   # 30-minute inactivity timeout
        max_history_tokens: int = 6000,    # leave headroom for retrieval context
        max_sessions: int = 1000,          # LRU eviction ceiling
    ):
        self.jwt_secret = jwt_secret
        self.jwt_algorithm = jwt_algorithm
        self.session_ttl = session_ttl_seconds
        self.max_history_chars = max_history_tokens * self.CHARS_PER_TOKEN
        # OrderedDict used as LRU: oldest sessions evicted when max_sessions reached
        self._sessions: OrderedDict[str, SessionData] = OrderedDict()
        self._max_sessions = max_sessions

    # ── Auth ───────────────────────────────────────────────────────────────

    def validate_token(self, token: str) -> dict:
        """
        Decode and validate a JWT. Raises jwt.PyJWTError on failure.

        Returns the decoded payload (includes user_id, exp, iat).
        """
        return jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])

    def get_or_create_session(self, token: str) -> SessionData:
        """
        Validate the JWT and return an existing active session or create one.

        Raises jwt.PyJWTError if the token is invalid.
        Raises SessionExpiredError if the session has exceeded the inactivity TTL.
        """
        payload = self.validate_token(token)
        user_id = payload["sub"]

        # Resume existing session if present and still active
        if user_id in self._sessions:
            session = self._sessions[user_id]
            if self._is_expired(session):
                self._evict(user_id)
                raise SessionExpiredError(f"Session for user {user_id} has expired.")
            # Refresh LRU position
            self._sessions.move_to_end(user_id)
            return session

        # New session
        session = SessionData(
            user_id=user_id,
            session_id=str(uuid.uuid4()),
        )
        self._store(user_id, session)
        return session

    # ── History management ─────────────────────────────────────────────────

    def append_turn(self, session: SessionData, role: str, content: str) -> None:
        """
        Add a message turn to the session history, then trim to token budget.

        Trims oldest messages first, always preserving the most recent turn.
        """
        session.conversation_history.append({"role": role, "content": content})
        session.last_active = time.time()
        self._trim_history(session)

    def get_history(self, session: SessionData) -> list[dict]:
        """Return a copy of the bounded conversation history."""
        return list(session.conversation_history)

    def clear_session(self, user_id: str) -> None:
        """Explicit logout — evict session immediately."""
        self._evict(user_id)

    # ── Internal ───────────────────────────────────────────────────────────

    def _trim_history(self, session: SessionData) -> None:
        """Remove oldest messages until history fits within the token budget."""
        while self._history_chars(session) > self.max_history_chars and len(session.conversation_history) > 1:
            session.conversation_history.pop(0)   # evict oldest

    def _history_chars(self, session: SessionData) -> int:
        return sum(len(m["content"]) for m in session.conversation_history)

    def _is_expired(self, session: SessionData) -> bool:
        return (time.time() - session.last_active) > self.session_ttl

    def _store(self, user_id: str, session: SessionData) -> None:
        """Insert session, evicting LRU entry if at capacity."""
        if len(self._sessions) >= self._max_sessions:
            self._sessions.popitem(last=False)   # evict least-recently-used
        self._sessions[user_id] = session

    def _evict(self, user_id: str) -> None:
        self._sessions.pop(user_id, None)


class SessionExpiredError(Exception):
    """Raised when a session has exceeded the inactivity TTL."""
