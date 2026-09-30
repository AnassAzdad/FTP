"use client";
import { useState } from "react";

export function Avatar({ robloxId, name, size = 32 }: { robloxId: string | number; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, borderRadius: "50%", flex: "none" as const };
  if (failed) {
    return (
      <span style={{ ...style, display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "var(--line)", color: "var(--muted)", fontWeight: 700, fontSize: size * 0.4 }}>
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/api/avatar/${robloxId}`} alt="" width={size} height={size} loading="lazy"
    style={{ ...style, background: "var(--line)" }} onError={() => setFailed(true)} />;
}
