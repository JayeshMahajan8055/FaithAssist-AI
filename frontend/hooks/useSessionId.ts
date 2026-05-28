import { useEffect, useState } from "react";

export function useSessionId() {
  const [sessionId, setSessionId] = useState("session-local");

  useEffect(() => {
    const existing = window.localStorage.getItem("faithassist-session-id");
    if (existing) {
      setSessionId(existing);
      return;
    }
    const next = crypto.randomUUID();
    window.localStorage.setItem("faithassist-session-id", next);
    setSessionId(next);
  }, []);

  return sessionId;
}
