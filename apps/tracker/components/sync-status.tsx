"use client";

import { Cloud, CloudOff, Loader2 } from "lucide-react";

interface SyncStatusProps {
  status: "local-only" | "syncing" | "synced" | "error";
}

export function SyncStatus({ status }: SyncStatusProps) {
  const getStatusInfo = () => {
    switch (status) {
      case "local-only":
        return {
          icon: <CloudOff className="h-3 w-3" />,
          text: "Local only",
          color: "text-muted-foreground",
        };
      case "syncing":
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: "Syncing...",
          color: "text-blue-600",
        };
      case "synced":
        return {
          icon: <Cloud className="h-3 w-3" />,
          text: "Synced",
          color: "text-green-600",
        };
      case "error":
        return {
          icon: <CloudOff className="h-3 w-3" />,
          text: "Sync error",
          color: "text-red-600",
        };
    }
  };

  const { icon, text, color } = getStatusInfo();

  return (
    <div className={`flex items-center gap-1 font-mono text-xs ${color}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}
