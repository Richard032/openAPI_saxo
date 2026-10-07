import { useEffect, useRef, useState } from "react";

export type ConnectionState = "checking" | "connected" | "disconnected";

const query = new URLSearchParams(window.location.search);
const justConnected = query.get("connected") === "1";
const justDisconnected = query.get("disconnected") === "1";

function disconnectRequest(body: string) {
  return fetch("/api/saxo/disconnect", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body,
  });
}

export function useSaxoConnection() {
  const [state, setState] = useState<ConnectionState>(() =>
    justConnected ? "connected" : justDisconnected ? "disconnected" : "checking",
  );
  const [message, setMessage] = useState("");
  const disconnectRequestInFlight = useRef(false);

  // This protected status request prompts for the demo admin login on page load.
  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        const response = await fetch("/api/saxo/status", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!active) return;
        if (!response.ok) {
          setState(justConnected ? "connected" : "disconnected");
          return;
        }
        const result: { connected?: boolean } = await response.json();
        setState(result.connected ? "connected" : "disconnected");
      } catch {
        if (active) setState(justConnected ? "connected" : "disconnected");
      }
    }

    void loadStatus();
    return () => {
      active = false;
    };
  }, []);

  // A tab close or navigation can interrupt this request, so it is best-effort.
  useEffect(() => {
    if (state !== "connected") return;

    function disconnectWhenLeaving() {
      if (disconnectRequestInFlight.current) return;
      void disconnectRequest("tab-closed").catch(() => {});
    }

    window.addEventListener("pagehide", disconnectWhenLeaving);
    return () => window.removeEventListener("pagehide", disconnectWhenLeaving);
  }, [state]);

  async function checkConnection() {
    setMessage("Checking the Saxo simulation connection…");
    try {
      const response = await fetch("/api/saxo/connection/check", {
        credentials: "same-origin",
      });
      if (response.ok) {
        const result: { connected?: boolean } = await response.json();
        setState(result.connected ? "connected" : "disconnected");
        setMessage(
          result.connected
            ? "Saxo simulation is connected."
            : "Saxo is not connected yet. Use Connect Saxo to authorize the simulation account.",
        );
      } else if (response.status === 401) {
        setState("disconnected");
        setMessage("Connect your Saxo simulation account to continue.");
      } else {
        setMessage("The Saxo connection check failed. Try again shortly.");
      }
    } catch {
      setMessage("Could not reach the demo server. Try again shortly.");
    }
  }

  async function disconnect() {
    disconnectRequestInFlight.current = true;
    setMessage("Disconnecting Saxo from this demo…");
    try {
      const response = await disconnectRequest("button");
      if (response.ok) {
        setState("disconnected");
        setMessage("Saxo disconnected. The demo cleared its in-memory tokens.");
      } else if (response.status === 401) {
        setMessage("The demo admin sign-in expired. Connect again to sign in, then retry disconnecting.");
      } else {
        setMessage("Could not disconnect Saxo. Try again shortly.");
      }
    } catch {
      setMessage("Could not reach the demo server to disconnect Saxo.");
    } finally {
      disconnectRequestInFlight.current = false;
    }
  }

  return { state, message, setMessage, checkConnection, disconnect, justConnected, justDisconnected };
}
