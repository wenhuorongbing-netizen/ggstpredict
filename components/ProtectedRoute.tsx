/* eslint-disable */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Run this only on the client
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("userId");
      const role = localStorage.getItem("role");

      if (!userId) {
        router.push("/");
      } else if (requireAdmin && role !== "ADMIN") {
        router.push("/dashboard");
      } else {
        setIsAuthorized(true);
      }
    }
  }, [router, requireAdmin]);

  // Prevent rendering anything while we check authentication
  // This prevents the "flash of unauthorized content" or layout shifting
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-red-500 animate-spin text-4xl">⚙</div>
      </div>
    );
  }

  return <>{children}</>;
}