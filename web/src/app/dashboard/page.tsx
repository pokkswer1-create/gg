"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardSummary = {
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  netProfit: number;
  memberCount: number;
  totalClasses: number;
  unpaidAmount: number;
  unpaidCount: number;
  absenceRate: number;
  makeupWaiting: number;
  monthlyData: { month: string; revenue: number; cost: number; profit: number; members: number }[];
};

export default function DashboardPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  const monthOptions = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 12 }).map((_, idx) => {
      const d = new Date(base);
      d.setMonth(base.getMonth() - idx);
      const value = d.toISOString().slice(0, 7);
      return value;
    });
  }, []);

  useEffect(() => {
    const run = async () => {
      const res = await fetch(`/api/dashboard/summary?month=${month}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "대시보드를 불러오지 못했습니다.");
        return;
      }
      setData(json);
    };
    void run();
  }, [month]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">대시보드</h1>
        <select
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          {monthOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-rose-500">{error}</p> : null}
      {!data ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard href="/payments" title="이번달 매출" value={formatWon(data.thisMonthRevenue)} />
            <KpiCard href="/payments" title="지난달 매출" value={formatWon(data.lastMonthRevenue)} />
            <KpiCard href="/dashboard" title="순이익" value={formatWon(data.netProfit)} />
            <KpiCard href="/students" title="회원수" value={`${data.memberCount}명`} />
            <KpiCard href="/classes" title="총 수업횟수" value={`${data.totalClasses}회`} />
            <KpiCard href="/payments" title="미납금" value={formatWon(data.unpaidAmount)} />
            <KpiCard href="/attendance" title="결석률" value={`${data.absenceRate}%`} />
            <KpiCard href="/attendance" title="보강대기" value={`${data.makeupWaiting}건`} />
          </section>

          <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="mb-3 font-semibold">월별 매출/비용/순이익</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-100 dark:bg-zinc-900/60">
                  <tr>
                    <th className="px-3 py-2 text-left">월</th>
                    <th className="px-3 py-2 text-left">매출</th>
                    <th className="px-3 py-2 text-left">비용</th>
                    <th className="px-3 py-2 text-left">순이익</th>
                    <th className="px-3 py-2 text-left">회원수</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthlyData.map((row) => (
                    <tr key={row.month} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-2">{row.month}</td>
                      <td className="px-3 py-2">{formatWon(row.revenue)}</td>
                      <td className="px-3 py-2">{formatWon(row.cost)}</td>
                      <td className="px-3 py-2">{formatWon(row.profit)}</td>
                      <td className="px-3 py-2">{row.members}명</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </>
      )}
    </main>
  );
}

function KpiCard({ href, title, value }: { href: string; title: string; value: string }) {
  return (
    <Link href={href} className="rounded-xl border border-zinc-200 p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/40">
      <p className="text-sm opacity-75">{title}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </Link>
  );
}

function formatWon(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}
