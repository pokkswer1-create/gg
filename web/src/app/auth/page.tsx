"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AuthPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseClient> | null>(
    null
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let client: ReturnType<typeof getSupabaseClient>;
    try {
      client = getSupabaseClient();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupabase(client);
    } catch (error) {
      setStatus((error as Error).message);
      return;
    }

    const loadSession = async () => {
      const { data, error } = await client.auth.getSession();
      if (error) {
        setStatus(error.message);
        return;
      }

      setSession(data.session);
    };

    loadSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignUp = async () => {
    setLoading(true);
    setStatus("");

    if (!supabase) {
      setStatus("Supabase 클라이언트가 아직 준비되지 않았습니다.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setStatus(`회원가입 실패: ${error.message}`);
      return;
    }

    setStatus(
      data.user?.identities?.length
        ? "회원가입 완료. 관리자 승인 후 로그인할 수 있습니다. (이메일 인증이 켜져 있으면 인증도 완료하세요)"
        : "이미 등록된 이메일입니다. 로그인해 주세요."
    );
  };

  const handleSignIn = async () => {
    setLoading(true);
    setStatus("");

    if (!supabase) {
      setStatus("Supabase 클라이언트가 아직 준비되지 않았습니다.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setStatus(`로그인 실패: ${error.message}`);
      return;
    }

    const token = data.session?.access_token;
    if (token) {
      const checkRes = await fetch("/api/auth/access-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const checkJson = await checkRes.json();
      if (!checkRes.ok) {
        await supabase.auth.signOut();
        setStatus(checkJson.error ?? "승인 상태 확인 실패");
        return;
      }
      if (!checkJson.approved) {
        await supabase.auth.signOut();
        setStatus("관리자 승인 대기중입니다. 승인 후 로그인해 주세요.");
        return;
      }
    }

    localStorage.setItem("kva-refresh-once", "1");
    setStatus("로그인 완료. 대시보드로 이동합니다.");
    window.location.href = "/dashboard";
  };

  const handleSignOut = async () => {
    setLoading(true);
    setStatus("");

    if (!supabase) {
      setStatus("Supabase 클라이언트가 아직 준비되지 않았습니다.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signOut();
    setLoading(false);

    if (error) {
      setStatus(`로그아웃 실패: ${error.message}`);
      return;
    }

    setStatus("로그아웃 완료.");
  };

  const handleFindId = () => {
    setStatus("아이디(이메일) 찾기는 관리자에게 문의해 주세요.");
  };

  const handleResetPassword = async () => {
    if (!supabase) {
      setStatus("Supabase 클라이언트가 아직 준비되지 않았습니다.");
      return;
    }
    if (!email.trim()) {
      setStatus("비밀번호 찾기를 위해 이메일을 먼저 입력해 주세요.");
      return;
    }
    setLoading(true);
    setStatus("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);
    if (error) {
      setStatus(`비밀번호 재설정 메일 전송 실패: ${error.message}`);
      return;
    }
    setStatus("비밀번호 재설정 메일을 보냈습니다. 이메일을 확인해 주세요.");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">인증 관리</h1>
        <Link className="text-sm underline opacity-80 hover:opacity-100" href="/dashboard">
          대시보드
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm">
          상태:{" "}
          <span className="font-medium">
            {session ? `로그인됨 (${session.user.email})` : "로그아웃됨"}
          </span>
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <label className="grid gap-2 text-sm">
          이메일
          <input
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-500 dark:border-zinc-700"
            type="email"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm">
          비밀번호
          <input
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-500 dark:border-zinc-700"
            type="password"
            placeholder="6자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            onClick={handleSignIn}
            disabled={loading}
            type="button"
          >
            로그인
          </button>
          <button
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
            onClick={handleSignUp}
            disabled={loading}
            type="button"
          >
            회원가입
          </button>
          <button
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
            onClick={handleSignOut}
            disabled={loading}
            type="button"
          >
            로그아웃
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
            onClick={handleFindId}
            disabled={loading}
            type="button"
          >
            아이디 찾기
          </button>
          <button
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
            onClick={handleResetPassword}
            disabled={loading}
            type="button"
          >
            비밀번호 찾기
          </button>
        </div>
      </div>

      {status ? (
        <p className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          {status}
        </p>
      ) : null}
    </main>
  );
}
