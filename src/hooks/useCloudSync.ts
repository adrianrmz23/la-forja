import { useContext } from "react";
import { CloudSyncContext } from "../contexts/cloudSyncContext.ts";

export function useCloudSync() {
  const context = useContext(CloudSyncContext);
  if (!context) {
    throw new Error("useCloudSync debe utilizarse dentro de CloudSyncProvider.");
  }
  return context;
}
