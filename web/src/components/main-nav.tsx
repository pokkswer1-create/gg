"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type SubItem = {
  href: string;
  label: string;
  /** 있으면 이 문자열로 시작하는 경로도 하위 메뉴 활성(예: 학부모 /admin/parent-) */
  groupPrefix?: string;
};

type DropdownDef = { id: string; label: string; items: SubItem[] };

const dropdowns: DropdownDef[] = [
  {
    id: "member",
    label: "회원",
    items: [
      { href: "/students", label: "회원관리" },
      { href: "/attendance", label: "출석" },
      { href: "/classes", label: "수업" },
      { href: "/shuttle", label: "셔틀" },
      { href: "/payments", label: "결제" },
    ],
  },
  {
    id: "staff",
    label: "직원",
    items: [
      { href: "/journals", label: "업무" },
      { href: "/payroll", label: "급여" },
      { href: "/expenses", label: "지출" },
      { href: "/instagram", label: "인스타" },
      { href: "/admin/user-approvals", label: "회원승인" },
      { href: "/auth", label: "인증" },
    ],
  },
  {
    id: "customer",
    label: "고객",
    items: [
      { href: "/admin/announcements", label: "안내" },
      { href: "/admin/parent-site", label: "학부모 사이트", groupPrefix: "/admin/parent-" },
    ],
  },
  {
    id: "reservation",
    label: "예약",
    items: [
      { href: "/naver-reservations", label: "네이버" },
      { href: "/kakao-reservations", label: "카카오" },
      { href: "/admin/applications", label: "수업신청" },
    ],
  },
];

function subActive(pathname: string, item: SubItem): boolean {
  if (item.groupPrefix) {
    return pathname.startsWith(item.groupPrefix);
  }
  if (pathname === item.href) return true;
  if (item.href === "/") return false;
  return pathname.startsWith(`${item.href}/`);
}

function groupActive(pathname: string, items: SubItem[]): boolean {
  return items.some((item) => subActive(pathname, item));
}

export function MainNav() {
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const close = useCallback(() => setOpenId(null), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!navRef.current?.contains(e.target as Node)) {
        setOpenId(null);
      }
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 border-b border-zinc-200 bg-background/95 backdrop-blur dark:border-zinc-800"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-1 px-3 py-2 sm:gap-2 sm:px-4 sm:py-3">
        <Link
          href="/"
          className={`rounded-md px-2.5 py-1.5 text-sm sm:px-3 ${
            pathname === "/"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-300 dark:border-zinc-700"
          }`}
        >
          홈
        </Link>
        <Link
          href="/dashboard"
          className={`rounded-md px-2.5 py-1.5 text-sm sm:px-3 ${
            pathname === "/dashboard"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-300 dark:border-zinc-700"
          }`}
        >
          대시보드
        </Link>
        <Link
          href="/calendar"
          className={`rounded-md px-2.5 py-1.5 text-sm sm:px-3 ${
            pathname === "/calendar"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-300 dark:border-zinc-700"
          }`}
        >
          달력
        </Link>

        {dropdowns.map((group) => {
          const open = openId === group.id;
          const active = groupActive(pathname, group.items);
          return (
            <div key={group.id} className="relative">
              <button
                type="button"
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenId(open ? null : group.id);
                }}
                className={`rounded-md border px-2.5 py-1.5 text-sm sm:px-3 ${
                  active || open
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                {group.label}
                <span className="ml-0.5 opacity-70" aria-hidden>
                  ▾
                </span>
              </button>
              {open ? (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-50 mt-1 min-w-[11rem] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
                >
                  {group.items.map((item) => {
                    const sub = subActive(pathname, item);
                    return (
                      <Link
                        key={item.href}
                        role="menuitem"
                        href={item.href}
                        className={`block px-3 py-2 text-sm ${
                          sub
                            ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                            : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        }`}
                        onClick={close}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
