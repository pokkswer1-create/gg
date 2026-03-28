"use client";

import { MainNav } from "@/components/main-nav";
import { TestModeBanner } from "@/components/test-mode-banner";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * 학부모 공개 페이지(/parents)에서는 관리자 네비·테스트 배너를 숨긴다.
 * 첫 페인트까지는 항상 네비를 그려 서버 HTML과 클라이언트 hydration이 맞도록 한다
 * (usePathname()이 서버에서 null/불일치일 때 생기는 hydration 오류 방지).
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const parentsPublic =
    pathname === "/parents" || (pathname?.startsWith("/parents/") ?? false);
  const hideStaffChrome = mounted && parentsPublic;

  if (hideStaffChrome) {
    return <>{children}</>;
  }

  return (
    <>
      <TestModeBanner />
      <MainNav />
      {children}
    </>
  );
}
