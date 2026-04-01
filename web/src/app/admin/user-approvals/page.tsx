"use client";

import { useMemo, useState } from "react";

type ProfileRow = {
  id: string;
  full_name: string;
  email: string | null;
  role: "admin" | "teacher";
  approved: boolean;
  created_at: string;
  approved_at: string | null;
};

function toBasicAuth(id: string, password: string) {
  return `Basic ${btoa(`${id}:${password}`)}`;
}

export default function UserApprovalsPage() {
  const [adminId, setAdminId] = useState("pokkswer");
  const [adminPassword, setAdminPassword] = useState("강선00!!");
  const [pending, setPending] = useState<ProfileRow[]>([]);
  const [approved, setApproved] = useState<ProfileRow[]>([]);
  const [status, setStatus] = useState("");

  const authHeader = useMemo(
    () => toBasicAuth(adminId.trim(), adminPassword),
    [adminId, adminPassword]
  );

  const load = async () => {
    setStatus("");
    const res = await fetch("/api/admin/user-approvals", {
      headers: { Authorization: authHeader },
    });
    const json = await res.json();
    if (!res.ok) {
      setStatus(json.error ?? "목록 조회 실패");
      return;
    }
    setPending(json.pending ?? []);
    setApproved(json.approved ?? []);
  };

  const approveUser = async (userId: string, role: "admin" | "teacher") => {
    setStatus("");
    const res = await fetch(`/api/admin/user-approvals/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ approve: true, role }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatus(json.error ?? "승인 실패");
      return;
    }
    await load();
  };

  const revokeUser = async (userId: string) => {
    setStatus("");
    const res = await fetch(`/api/admin/user-approvals/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ approve: false }),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatus(json.error ?? "승인 취소 실패");
      return;
    }
    await load();
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">회원 승인 관리</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        회원가입 후 승인 대기 상태인 계정을 승인해야 API 접근이 가능합니다.
      </p>

      <section className="grid gap-3 rounded-xl border p-4 dark:border-zinc-800 md:grid-cols-4">
        <input
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          placeholder="관리자 아이디"
          value={adminId}
          onChange={(e) => setAdminId(e.target.value)}
        />
        <input
          type="password"
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          placeholder="관리자 비밀번호"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
        />
        <button
          className="rounded bg-zinc-900 px-3 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
          type="button"
          onClick={load}
        >
          승인 대기 목록 불러오기
        </button>
      </section>

      {status ? <p className="text-sm text-rose-500">{status}</p> : null}

      <section className="rounded-xl border p-4 dark:border-zinc-800">
        <h2 className="mb-2 font-medium">승인 대기 ({pending.length})</h2>
        <div className="space-y-2">
          {pending.length === 0 ? <p className="text-sm text-zinc-500">대기 계정이 없습니다.</p> : null}
          {pending.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-200 p-3 text-sm dark:border-zinc-700"
            >
              <div>
                <p className="font-medium">{u.full_name}</p>
                <p className="text-zinc-500">{u.email ?? "이메일 없음"}</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded bg-emerald-600 px-2 py-1 text-white"
                  type="button"
                  onClick={() => approveUser(u.id, "teacher")}
                >
                  교사로 승인
                </button>
                <button
                  className="rounded bg-violet-600 px-2 py-1 text-white"
                  type="button"
                  onClick={() => approveUser(u.id, "admin")}
                >
                  관리자로 승인
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-4 dark:border-zinc-800">
        <h2 className="mb-2 font-medium">승인 완료 ({approved.length})</h2>
        <div className="space-y-2">
          {approved.slice(0, 30).map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-200 p-3 text-sm dark:border-zinc-700"
            >
              <div>
                <p className="font-medium">
                  {u.full_name} <span className="text-xs text-zinc-500">({u.role})</span>
                </p>
                <p className="text-zinc-500">{u.email ?? "이메일 없음"}</p>
              </div>
              <button
                className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700"
                type="button"
                onClick={() => revokeUser(u.id)}
              >
                승인 취소
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

