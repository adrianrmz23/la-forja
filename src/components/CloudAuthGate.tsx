import type { ReactNode } from "react";
import { Cloud, LoaderCircle } from "lucide-react";
import { useCloudSync } from "../hooks/useCloudSync.ts";
import AuthPage from "../pages/AuthPage.tsx";

export function CloudAuthGate({ children }: { children: ReactNode }) {
  const { configured, session, status } = useCloudSync();

  if (!configured) return children;
  if (session) return children;
  if (status === "auth-required" || status === "error") return <AuthPage />;

  return (
    <main className="cloud-loading-page">
      <LoaderCircle className="cloud-spin" size={30} />
      <Cloud size={22} />
      <strong>Conectando La Forja...</strong>
    </main>
  );
}
