import { getSupabaseServer } from "@/lib/supabase/server";
import { HomeAiAssistant } from "@/components/home-ai-assistant";
import { HomeAttendanceNotifier } from "@/components/home-attendance-notifier";
import { HomeWebPush } from "@/components/home-web-push";
import { HomeKvaNotices } from "@/components/home-kva-notices";
import { HomeTodayChecklist } from "@/components/home-today-checklist";
import Link from "next/link";

async function checkSupabaseConnection() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return { ok: false, message: error.message };
    }

    return {
      ok: true,
      message: data.session
        ? "Supabase 연결 성공. 활성 세션이 있습니다."
        : "Supabase 연결 성공. 현재 로그인 세션은 없습니다.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Supabase 환경변수가 누락되었습니다.",
    };
  }
}

export default async function Home() {
  const result = await checkSupabaseConnection();
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const parentsShareUrl = siteBase ? `${siteBase}/parents` : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">학원 관리 시스템</h1>

      <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-4 text-sm leading-relaxed text-zinc-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-zinc-200">
        <p className="font-medium text-sky-900 dark:text-sky-200">학부모 안내 페이지 (별도 주소)</p>
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          학부모에게는 홈(/)이 아니라 전용 링크만 안내하세요. 운영 도메인이 정해지면{" "}
          <code className="rounded bg-white/80 px-1 dark:bg-zinc-900">NEXT_PUBLIC_SITE_URL</code>에
          사이트 루트 URL을 넣으면 아래에 복사용 전체 주소가 표시됩니다.
        </p>
        <p className="mt-2 font-mono text-[13px] break-all">
          {parentsShareUrl ?? (
            <>
              예: <span className="text-zinc-500">https://your-domain.vercel.app</span>
              <span className="text-sky-700 dark:text-sky-300">/parents</span>
            </>
          )}
        </p>
        <p className="mt-2">
          <Link className="font-medium text-sky-700 underline hover:text-sky-900 dark:text-sky-300" href="/parents">
            학부모 안내 페이지 열기 →
          </Link>
          {" · "}
          <Link className="text-sky-600 underline dark:text-sky-400" href="/admin/parent-settings">
            학부모 사이트 설정
          </Link>
        </p>
      </div>

      <HomeKvaNotices />

      <HomeTodayChecklist />

      <HomeAiAssistant />

      <HomeWebPush />

      <HomeAttendanceNotifier />

      <p className="text-zinc-600 dark:text-zinc-300">서버 런타임 Supabase 연결 상태:</p>

      <div
        className={`rounded-xl border p-4 ${
          result.ok
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-rose-500/40 bg-rose-500/10"
        }`}
      >
        <p className="font-medium">{result.ok ? "연결됨" : "연결 실패"}</p>
        <p className="mt-1 text-sm opacity-90">{result.message}</p>
      </div>

      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm leading-6">
          1) <code>.env.example</code>을 <code>.env.local</code>로 복사
          <br />
          2) Supabase 키 입력
          <br />
          3) Vercel 환경변수에도 동일 값 등록
        </p>
      </div>

      <div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="underline opacity-80 hover:opacity-100" href="/parents">
            학부모 안내
          </Link>
          <Link className="underline opacity-80 hover:opacity-100" href="/dashboard">
            대시보드
          </Link>
          <Link className="underline opacity-80 hover:opacity-100" href="/calendar">
            달력
          </Link>
          <Link className="underline opacity-80 hover:opacity-100" href="/students">
            회원관리
          </Link>
          <Link className="underline opacity-80 hover:opacity-100" href="/classes">
            수업관리
          </Link>
          <Link className="underline opacity-80 hover:opacity-100" href="/attendance">
            출석관리
          </Link>
          <Link className="underline opacity-80 hover:opacity-100" href="/payments">
            결제관리
          </Link>
          <Link className="underline opacity-80 hover:opacity-100" href="/journals">
            업무일지
          </Link>
          <Link className="underline opacity-80 hover:opacity-100" href="/payroll">
            급여관리
          </Link>
          <Link className="underline opacity-80 hover:opacity-100" href="/naver-reservations">
            네이버예약
          </Link>
          <Link className="underline opacity-80 hover:opacity-100" href="/kakao-reservations">
            카카오예약
          </Link>
          <Link className="underline opacity-80 hover:opacity-100" href="/auth">
            인증
          </Link>
        </div>
      </div>
    </main>
  );
}
