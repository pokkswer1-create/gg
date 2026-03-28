import Link from "next/link";

export default function ParentSiteAdminPage() {
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const parentsPublicUrl = siteBase ? `${siteBase}/parents` : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">학부모 사이트</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          학부모 전용 공개 페이지(<code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">/parents</code>)를
          미리 보고, 수강료·안내 문구·공지를 수정합니다. 학부모에게는 이 주소만 안내하세요.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/parents"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-zinc-200 p-5 transition hover:border-sky-500 hover:bg-sky-50/50 dark:border-zinc-800 dark:hover:border-sky-600 dark:hover:bg-sky-950/30"
        >
          <h2 className="font-semibold text-sky-700 dark:text-sky-300">공개 페이지 미리보기</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            학부모가 보는 화면을 새 탭에서 엽니다.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-sky-600 underline dark:text-sky-400">
            /parents 열기 ↗
          </span>
        </Link>

        <Link
          href="/admin/parent-settings"
          className="rounded-xl border border-zinc-200 p-5 transition hover:border-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-300 dark:hover:bg-zinc-900/40"
        >
          <h2 className="font-semibold">콘텐츠·공지 관리</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            준비물, 셔틀, 결제·보강·환불 안내, 수강료 JSON, 공지 등록
          </p>
          <span className="mt-3 inline-block text-sm font-medium underline opacity-90">
            설정으로 이동 →
          </span>
        </Link>

        <Link
          href="/admin/applications"
          className="rounded-xl border border-zinc-200 p-5 transition hover:border-emerald-600 hover:bg-emerald-50/50 dark:border-zinc-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
        >
          <h2 className="font-semibold text-emerald-800 dark:text-emerald-200">수업 신청 목록</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            학부모 사이트에서 접수된 체험·정규·대표팀·보강 신청을 확인합니다.
          </p>
          <span className="mt-3 inline-block text-sm font-medium text-emerald-700 underline dark:text-emerald-400">
            신청 관리 →
          </span>
        </Link>
      </section>

      <section className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5 dark:border-zinc-700 dark:bg-zinc-900/50">
        <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">학부모에게 보낼 링크</h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          배포 도메인을 <code className="rounded bg-white px-1 dark:bg-zinc-800">NEXT_PUBLIC_SITE_URL</code>에
          넣으면 아래에 전체 URL이 표시됩니다.
        </p>
        <p className="mt-3 break-all font-mono text-sm text-zinc-800 dark:text-zinc-200">
          {parentsPublicUrl ?? (
            <>
              <span className="text-zinc-500">(도메인 설정 시)</span> …/parents
            </>
          )}
        </p>
      </section>
    </main>
  );
}
