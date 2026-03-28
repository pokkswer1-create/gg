"use client";

import type { Student } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

type StudentWithMeta = Student & {
  enrollments?: {
    id: string;
    class_id: string;
    monthly_fee: number;
    classes?: { id: string; name: string; monthly_fee: number } | null;
  }[];
  payments?: { month_key: string; status: string; paid_at: string | null }[];
};

type StudentForm = {
  name: string;
  phone: string;
  grade: string;
  status: "active" | "paused" | "withdrawn";
  class_id: string;
  monthly_fee: number;
  parent_name: string;
  parent_phone: string;
  join_date: string;
};

const initialForm: StudentForm = {
  name: "",
  phone: "",
  grade: "",
  status: "active",
  class_id: "",
  monthly_fee: 0,
  parent_name: "",
  parent_phone: "",
  join_date: new Date().toISOString().slice(0, 10),
};

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithMeta[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; monthly_fee: number }[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [grade, setGrade] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState<StudentForm>(initialForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<{ id: string; title: string }[]>([]);
  const [announcementId, setAnnouncementId] = useState("");
  const [sendChannel, setSendChannel] = useState<"kakao" | "sms" | "email">("kakao");

  const loadStudents = async () => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (status) params.set("status", status);
    if (grade) params.set("grade", grade);
    params.set("month", month);
    params.set("sort", "join_date.desc");

    const res = await fetch(`/api/students?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to load students.");
      return;
    }
    setStudents(json.data);
  };

  const loadAnnouncements = async () => {
    const res = await fetch("/api/announcements");
    const json = await res.json();
    if (res.ok) {
      setAnnouncements(
        (json.data ?? []).map((x: { id: string; title: string }) => ({ id: x.id, title: x.title }))
      );
    }
  };

  const loadClasses = async () => {
    const res = await fetch("/api/classes");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "수업 목록을 불러오지 못했습니다.");
      return;
    }
    setClasses(
      json.data.map((klass: { id: string; name: string; monthly_fee: number }) => ({
        id: klass.id,
        name: klass.name,
        monthly_fee: klass.monthly_fee,
      }))
    );
  };

  useEffect(() => {
    void loadStudents();
    void loadClasses();
    void loadAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const createStudent = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Failed to create student.");
      return;
    }
    setForm(initialForm);
    setStudents((prev) => [json.data, ...prev]);
  };

  const updateStatus = async (studentId: string, nextStatus: Student["status"]) => {
    const res = await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Failed to update status.");
      return;
    }
    setStudents((prev) => prev.map((item) => (item.id === studentId ? json.data : item)));
  };

  const downloadExcel = () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    window.location.href = `/api/members/export-excel?${params.toString()}`;
  };
  const downloadTemplateExcel = () => {
    window.location.href = "/api/members/template-excel";
  };

  const uploadExcel = async (file: File) => {
    const data = new FormData();
    data.append("file", file);
    const res = await fetch("/api/members/import-excel", { method: "POST", body: data });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "엑셀 업로드에 실패했습니다.");
      return;
    }
    if (json.errors?.length) {
      setError(`일부 행 실패: ${json.errors.map((e: { row: number; reason: string }) => `#${e.row} ${e.reason}`).join(", ")}`);
    }
    await loadStudents();
  };

  const sendAnnouncement = async () => {
    if (!announcementId) {
      setError("발송할 안내를 선택해 주세요.");
      return;
    }
    const memberIds = students.map((s) => s.id);
    const res = await fetch("/api/announcements/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcementId, memberIds, channel: sendChannel }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "안내 발송 실패");
      return;
    }
    setMessage(`안내 발송 완료: 성공 ${json.sentCount}, 실패 ${json.failCount}`);
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">회원 관리</h1>
      {error ? <p className="text-rose-500">{error}</p> : null}
      {message ? <p className="text-emerald-600">{message}</p> : null}

      <form className="grid gap-3 rounded-xl border p-4 dark:border-zinc-800 md:grid-cols-5" onSubmit={createStudent}>
        <input
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          placeholder="이름"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
        />
        <input
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          placeholder="휴대폰"
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          required
        />
        <input
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          placeholder="학년"
          value={form.grade}
          onChange={(e) => setForm((prev) => ({ ...prev, grade: e.target.value }))}
          required
        />
        <select
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          value={form.class_id}
          onChange={(e) => {
            const classId = e.target.value;
            const selected = classes.find((klass) => klass.id === classId);
            setForm((prev) => ({
              ...prev,
              class_id: classId,
              monthly_fee: selected ? Number(selected.monthly_fee ?? 0) : prev.monthly_fee,
            }));
          }}
        >
          <option value="">반 선택(선택)</option>
          {classes.map((klass) => (
            <option key={klass.id} value={klass.id}>
              {klass.name}
            </option>
          ))}
        </select>
        <input
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          type="number"
          placeholder="월료"
          value={form.monthly_fee}
          onChange={(e) => setForm((prev) => ({ ...prev, monthly_fee: Number(e.target.value) }))}
        />
        <button
          type="submit"
          className="rounded bg-zinc-900 px-3 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900 md:col-span-1"
          disabled={loading}
        >
          {loading ? "등록 중..." : "회원 추가"}
        </button>
        <input
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          placeholder="학부모 이름"
          value={form.parent_name}
          onChange={(e) => setForm((prev) => ({ ...prev, parent_name: e.target.value }))}
        />
        <input
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          placeholder="학부모 연락처"
          value={form.parent_phone}
          onChange={(e) => setForm((prev) => ({ ...prev, parent_phone: e.target.value }))}
        />
        <input
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          type="date"
          value={form.join_date}
          onChange={(e) => setForm((prev) => ({ ...prev, join_date: e.target.value }))}
        />
        <select
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          value={form.status}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, status: e.target.value as Student["status"] }))
          }
        >
          <option value="active">재원중</option>
          <option value="paused">휴원</option>
          <option value="withdrawn">퇴원</option>
        </select>
      </form>

      <section className="grid gap-3 rounded-xl border p-4 dark:border-zinc-800 md:grid-cols-6">
        <input
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          placeholder="이름/휴대폰 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          placeholder="학년 필터"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        />
        <select
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">전체 상태</option>
          <option value="active">재원중</option>
          <option value="break">휴원</option>
          <option value="withdrawn">퇴원</option>
        </select>
        <input
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <button
          type="button"
          onClick={loadStudents}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700"
        >
          검색
        </button>
      </section>

      <section className="grid gap-3 rounded-xl border p-4 dark:border-zinc-800 md:grid-cols-4">
        <div className="md:col-span-4">
          <h2 className="text-sm font-semibold">엑셀 일괄 등록</h2>
          <p className="mt-1 text-xs opacity-75">
            템플릿 파일에 학생 정보를 입력한 후 업로드하면 회원이 한 번에 등록됩니다.
          </p>
        </div>
        <label className="flex cursor-pointer items-center justify-center rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
          엑셀 파일 업로드
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadExcel(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={downloadTemplateExcel}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700"
        >
          템플릿 다운로드
        </button>
        <button
          type="button"
          onClick={downloadExcel}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700"
        >
          현재 회원 엑셀 다운로드
        </button>
      </section>

      <section className="grid gap-3 rounded-xl border p-4 dark:border-zinc-800 md:grid-cols-4">
        <select
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700 md:col-span-2"
          value={announcementId}
          onChange={(e) => setAnnouncementId(e.target.value)}
        >
          <option value="">안내 선택</option>
          {announcements.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          value={sendChannel}
          onChange={(e) => setSendChannel(e.target.value as "kakao" | "sms" | "email")}
        >
          <option value="kakao">카카오톡</option>
          <option value="sms">문자</option>
          <option value="email">이메일</option>
        </select>
        <button
          type="button"
          onClick={sendAnnouncement}
          className="rounded bg-zinc-900 px-3 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          현재 목록 회원에게 안내 발송
        </button>
      </section>

      <section className="flex flex-wrap gap-2">
        {[
          ["", "전체"],
          ["active", "재원중"],
          ["break", "휴원"],
          ["withdrawn", "탈원"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded border px-3 py-1.5 text-sm ${
              status === value
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
      </section>

      <div className="overflow-x-auto rounded-xl border dark:border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-900/60">
            <tr>
              <Th>이름</Th>
              <Th>학년</Th>
              <Th>연락처</Th>
              <Th>학부모</Th>
              <Th>상태</Th>
              <Th>반/월료</Th>
              <Th>가입일</Th>
              <Th>결제월</Th>
              <Th>변경</Th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <Td>
                  <Link className="underline" href={`/students/${student.id}`}>
                    {student.name}
                  </Link>
                </Td>
                <Td>{student.grade}</Td>
                <Td>{student.phone}</Td>
                <Td>{student.parent_name || "-"}</Td>
                <Td>{statusLabel(student.status)}</Td>
                <Td>
                  {student.enrollments?.[0]?.classes?.name ?? "-"} /{" "}
                  {(student.enrollments?.[0]?.monthly_fee ?? 0).toLocaleString("ko-KR")}원
                </Td>
                <Td>{student.join_date}</Td>
                <Td>
                  <div className="flex gap-1">
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const key = `${month.slice(0, 4)}-${String(idx + 1).padStart(2, "0")}`;
                      const paid = student.payments?.find((p) => p.month_key === key && p.status === "paid");
                      return (
                        <span
                          key={key}
                          title={
                            paid
                              ? `${idx + 1}월: 완료 (${paid.paid_at ? paid.paid_at.slice(0, 10) : "-"})`
                              : `${idx + 1}월: 미결제`
                          }
                          className={`inline-block h-3 w-3 rounded-full ${paid ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
                        />
                      );
                    })}
                  </div>
                </Td>
                <Td>
                  <select
                    className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
                    value={student.status}
                    onChange={(e) =>
                      updateStatus(student.id, e.target.value as Student["status"])
                    }
                  >
                    <option value="active">재원중</option>
                    <option value="paused">휴원</option>
                    <option value="withdrawn">퇴원</option>
                  </select>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function statusLabel(status: Student["status"]) {
  if (status === "active") return "재원중";
  if (status === "paused") return "휴원";
  if (status === "withdrawn") return "탈원";
  return status;
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium">{children}</th>;
}
function Td({ children }: { children: ReactNode }) {
  return <td className="px-3 py-2">{children}</td>;
}
