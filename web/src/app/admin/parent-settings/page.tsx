"use client";

import { authFetch } from "@/lib/auth-fetch";
import { defaultAcademySettings, defaultSiteBranding, mergeSiteBranding } from "@/lib/parent-site/defaults";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Tab = "branding" | "preparation" | "shuttle" | "payment" | "makeup" | "refund" | "tuition" | "notices";

export default function ParentSettingsPage() {
  const [tab, setTab] = useState<Tab>("branding");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preparationText, setPreparationText] = useState(
    defaultAcademySettings.preparation_items.join("\n")
  );
  const [shuttleJson, setShuttleJson] = useState(
    JSON.stringify(defaultAcademySettings.shuttle_info, null, 2)
  );
  const [paymentJson, setPaymentJson] = useState(
    JSON.stringify(defaultAcademySettings.payment_guide, null, 2)
  );
  const [makeupJson, setMakeupJson] = useState(
    JSON.stringify(defaultAcademySettings.makeup_policy, null, 2)
  );
  const [refundJson, setRefundJson] = useState(
    JSON.stringify(defaultAcademySettings.refund_policy, null, 2)
  );
  const [tuitionJson, setTuitionJson] = useState(
    JSON.stringify(defaultAcademySettings.tuition, null, 2)
  );
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [notices, setNotices] = useState<{ id: string; title: string; published_at: string }[]>([]);
  const [brandName, setBrandName] = useState(defaultSiteBranding.name);
  const [brandTitle, setBrandTitle] = useState(defaultSiteBranding.title);
  const [brandTagline, setBrandTagline] = useState(defaultSiteBranding.tagline);
  const [brandEmoji, setBrandEmoji] = useState(defaultSiteBranding.emoji);
  const [brandTrialIntro, setBrandTrialIntro] = useState(defaultSiteBranding.trial_intro);
  const [brandFooterAddress, setBrandFooterAddress] = useState(defaultSiteBranding.footer_address);
  const [brandFooterPhone, setBrandFooterPhone] = useState(defaultSiteBranding.footer_phone);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sRes, nRes] = await Promise.all([
        authFetch("/api/admin/parent-settings"),
        authFetch("/api/admin/public-notices"),
      ]);
      const sJson = await sRes.json();
      const nJson = await nRes.json();
      if (!sRes.ok) {
        setError(sJson.error ?? "설정을 불러오지 못했습니다.");
        setLoading(false);
        return;
      }
      const map = Object.fromEntries(
        (sJson.data as { setting_key: string; setting_value: unknown }[]).map((r) => [
          r.setting_key,
          r.setting_value,
        ])
      );
      if (Array.isArray(map.preparation_items)) {
        setPreparationText((map.preparation_items as string[]).join("\n"));
      }
      if (map.shuttle_info && typeof map.shuttle_info === "object") {
        setShuttleJson(JSON.stringify(map.shuttle_info, null, 2));
      }
      if (map.payment_guide && typeof map.payment_guide === "object") {
        setPaymentJson(JSON.stringify(map.payment_guide, null, 2));
      }
      if (map.makeup_policy && typeof map.makeup_policy === "object") {
        setMakeupJson(JSON.stringify(map.makeup_policy, null, 2));
      }
      if (map.refund_policy && typeof map.refund_policy === "object") {
        setRefundJson(JSON.stringify(map.refund_policy, null, 2));
      }
      if (map.tuition && typeof map.tuition === "object") {
        setTuitionJson(JSON.stringify(map.tuition, null, 2));
      }
      if (map.site_branding !== undefined) {
        const b = mergeSiteBranding(map.site_branding);
        setBrandName(b.name);
        setBrandTitle(b.title);
        setBrandTagline(b.tagline);
        setBrandEmoji(b.emoji);
        setBrandTrialIntro(b.trial_intro);
        setBrandFooterAddress(b.footer_address);
        setBrandFooterPhone(b.footer_phone);
      }
      if (nRes.ok && nJson.data) {
        setNotices(
          nJson.data.map((x: { id: string; title: string; published_at: string }) => ({
            id: x.id,
            title: x.title,
            published_at: x.published_at,
          }))
        );
      }
    } catch {
      setError("네트워크 오류");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveKey(key: string, value: unknown) {
    setMessage("");
    setError("");
    const res = await authFetch("/api/admin/parent-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settingKey: key, settingValue: value }),
    });
    let json: { error?: string } = {};
    try {
      json = (await res.json()) as { error?: string };
    } catch {
      setError(res.status === 401 ? "로그인이 필요합니다." : "저장 응답을 읽지 못했습니다.");
      return;
    }
    if (!res.ok) {
      setError(json.error ?? "저장 실패");
      return;
    }
    setMessage("저장되었습니다.");
  }

  async function saveBranding() {
    await saveKey("site_branding", {
      name: brandName.trim(),
      title: brandTitle.trim(),
      tagline: brandTagline.trim(),
      emoji: brandEmoji.trim(),
      trial_intro: brandTrialIntro.trim(),
      footer_address: brandFooterAddress.trim(),
      footer_phone: brandFooterPhone.trim(),
    });
  }

  async function savePreparation() {
    const lines = preparationText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    await saveKey("preparation_items", lines);
  }

  async function saveJson(key: string, raw: string) {
    try {
      const parsed = JSON.parse(raw);
      await saveKey(key, parsed);
    } catch {
      setError("JSON 형식이 올바르지 않습니다.");
    }
  }

  async function postNotice() {
    setMessage("");
    setError("");
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      setError("제목과 내용을 입력하세요.");
      return;
    }
    const res = await authFetch("/api/admin/public-notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: noticeTitle.trim(),
        content: noticeContent.trim(),
        category: "announcement",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "등록 실패");
      return;
    }
    setNoticeTitle("");
    setNoticeContent("");
    setMessage("공지가 등록되었습니다.");
    void load();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-2">
        <Link
          href="/admin/parent-site"
          className="text-sm text-zinc-500 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
        >
          ← 학부모 사이트
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">학부모 사이트 설정</h1>
        <Link
          href="/parents"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-sky-600 underline"
        >
          공개 페이지 미리보기 ↗
        </Link>
      </div>
      <p className="mb-6 text-sm text-zinc-600">
        수강료·안내 문구는 JSON으로 저장됩니다. 관리자 권한이 필요합니다.
      </p>

      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="mb-4 text-sm text-emerald-600">{message}</p> : null}

      <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-700">
        {(
          [
            ["branding", "사이트명"],
            ["preparation", "준비물"],
            ["shuttle", "셔틀"],
            ["payment", "결제"],
            ["makeup", "보강"],
            ["refund", "환불"],
            ["tuition", "수강료"],
            ["notices", "공지 등록"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-full px-3 py-1 text-sm ${
              tab === k
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-zinc-500">불러오는 중…</p> : null}

      {!loading && tab === "branding" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">사이트명·문구</h2>
          <p className="text-sm text-zinc-600">
            학부모 공개 페이지 상단, 배너, 푸터, 브라우저 탭 제목에 반영됩니다. 체험 안내 문구에는{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{"{name}"}</code>를 넣으면 짧은 이름으로
            바뀝니다.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-zinc-600">짧은 이름 (헤더·푸터·저작권)</span>
              <input
                className="mt-1 w-full rounded border border-zinc-300 p-2 dark:border-zinc-600 dark:bg-zinc-900"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">이모지 (선택, 헤더 앞)</span>
              <input
                className="mt-1 w-full rounded border border-zinc-300 p-2 dark:border-zinc-600 dark:bg-zinc-900"
                value={brandEmoji}
                onChange={(e) => setBrandEmoji(e.target.value)}
                placeholder="🏐"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-600">배너 큰 제목 (탭 제목에도 사용)</span>
              <input
                className="mt-1 w-full rounded border border-zinc-300 p-2 dark:border-zinc-600 dark:bg-zinc-900"
                value={brandTitle}
                onChange={(e) => setBrandTitle(e.target.value)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-600">배너 부제</span>
              <input
                className="mt-1 w-full rounded border border-zinc-300 p-2 dark:border-zinc-600 dark:bg-zinc-900"
                value={brandTagline}
                onChange={(e) => setBrandTagline(e.target.value)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-600">체험 모달 안내 문구</span>
              <textarea
                className="mt-1 min-h-[72px] w-full rounded border border-zinc-300 p-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                value={brandTrialIntro}
                onChange={(e) => setBrandTrialIntro(e.target.value)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-600">푸터 주소</span>
              <input
                className="mt-1 w-full rounded border border-zinc-300 p-2 dark:border-zinc-600 dark:bg-zinc-900"
                value={brandFooterAddress}
                onChange={(e) => setBrandFooterAddress(e.target.value)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-600">푸터 전화</span>
              <input
                className="mt-1 w-full rounded border border-zinc-300 p-2 dark:border-zinc-600 dark:bg-zinc-900"
                value={brandFooterPhone}
                onChange={(e) => setBrandFooterPhone(e.target.value)}
                placeholder="전화: 02-0000-0000"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => void saveBranding()}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            저장
          </button>
        </section>
      ) : null}

      {!loading && tab === "preparation" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">준비물 (한 줄에 하나씩)</h2>
          <textarea
            className="min-h-[200px] w-full rounded border border-zinc-300 p-3 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
            value={preparationText}
            onChange={(e) => setPreparationText(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void savePreparation()}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            저장
          </button>
        </section>
      ) : null}

      {!loading && tab === "shuttle" ? (
        <JsonEditorTab title="셔틀 안내 (JSON)" value={shuttleJson} onChange={setShuttleJson} onSave={() => saveJson("shuttle_info", shuttleJson)} />
      ) : null}
      {!loading && tab === "payment" ? (
        <JsonEditorTab title="결제 안내 (JSON)" value={paymentJson} onChange={setPaymentJson} onSave={() => saveJson("payment_guide", paymentJson)} />
      ) : null}
      {!loading && tab === "makeup" ? (
        <JsonEditorTab title="보강 정책 (JSON)" value={makeupJson} onChange={setMakeupJson} onSave={() => saveJson("makeup_policy", makeupJson)} />
      ) : null}
      {!loading && tab === "refund" ? (
        <JsonEditorTab title="환불 정책 (JSON)" value={refundJson} onChange={setRefundJson} onSave={() => saveJson("refund_policy", refundJson)} />
      ) : null}
      {!loading && tab === "tuition" ? (
        <JsonEditorTab title="수강료 표 (JSON)" value={tuitionJson} onChange={setTuitionJson} onSave={() => saveJson("tuition", tuitionJson)} />
      ) : null}

      {!loading && tab === "notices" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">공지 등록</h2>
          <input
            className="w-full rounded border border-zinc-300 p-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="제목"
            value={noticeTitle}
            onChange={(e) => setNoticeTitle(e.target.value)}
          />
          <textarea
            className="min-h-[160px] w-full rounded border border-zinc-300 p-3 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="내용 (HTML 가능)"
            value={noticeContent}
            onChange={(e) => setNoticeContent(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void postNotice()}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            공지 등록
          </button>
          <div>
            <h3 className="mt-6 text-sm font-medium text-zinc-500">최근 공지</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {notices.map((n) => (
                <li key={n.id}>
                  {new Date(n.published_at).toLocaleDateString("ko-KR")} — {n.title}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function JsonEditorTab({
  title,
  value,
  onChange,
  onSave,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">{title}</h2>
      <textarea
        className="min-h-[280px] w-full rounded border border-zinc-300 p-3 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={onSave}
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        저장
      </button>
    </section>
  );
}
