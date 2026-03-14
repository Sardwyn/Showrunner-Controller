import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type StudioContextShape = {
  loading: boolean;
  error: any;
  ctx: any;
};

const StudioContext = createContext<StudioContextShape | null>(null);

export function StudioContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudioContextShape>({
    loading: true,
    error: null,
    ctx: null,
  });

  useEffect(() => {
    (async () => {
      try {
        // In dev, you're hitting Vite, which doesn't have this route.
        // In prod, it'll be the dashboard backend.
        const res = await fetch("/api/studio/context", {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(
            `Studio context HTTP ${res.status} ${res.statusText}`
          );
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error(
            `Studio context is not JSON (got "${contentType || "unknown"}")`
          );
        }

        const data = await res.json();
        setState({ loading: false, error: null, ctx: data });
      } catch (err) {
        console.error("[StudioContext] error", err);
        setState({ loading: false, error: err, ctx: null });
      }
    })();
  }, []);

  return (
    <StudioContext.Provider value={state}>{children}</StudioContext.Provider>
  );
}

export function useStudioContext() {
  const value = useContext(StudioContext);
  if (!value) {
    throw new Error("useStudioContext must be used inside <StudioContextProvider>");
  }
  return value;
}
