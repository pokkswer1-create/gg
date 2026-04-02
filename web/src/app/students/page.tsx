"use client";

import { authFetch } from "@/lib/auth-fetch";
import type { DiscountType, Student } from "@/lib/types";
import { calculateFinalFee, formatWon } from "@/lib/tuition";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

type StudentWithMeta = Student & {
  enrollments?: {
    id: string;
    class_id: string;
    monthly_fee: number;
    discount_type: DiscountType;
    discount_value: number;
    discount_reason: string | null;
    final_fee: number;
    classes?: { id: string; name: string; monthly_fee: number } | null;
  }[];
  payments?: { month_key: string; status: "paid" | "pending" | "unpaid" | "refunded" }[];
};

type Summary = {
  totalMembers: number;
  waitingMembers: number;
  thisMonthPaid: number;
  thisMonthUnpaid: number;
  classStats: { classId: string; className: string; count: number }[];
};

type BulkAction = "change_class" | "change_status" | "apply_discount" | "set_payment_status";

const emptySummary: Summary = {
  totalMembers: 0,
  waitingMembers: 0,
  thisMonthPaid: 0,
  thisMonthUnpaid: 0,
  classStats: [],
};

const initialCreateForm = {
  name: "",
  phone: "",
  grade: "",
  join_date: new Date().toISOString().slice(0, 10),
  status: "active" as Student["status"],
};

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentWithMeta[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; monthly_fee: number }[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [classId, setClassId] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [activeMonth, setActiveMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeYear, setActiveYear] = useState(new Date().toISOString().slice(0, 4));
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [bulkAction, setBulkAction] = useState<BulkAction>("change_status");
  const [bulkStatus, setBulkStatus] = useState<Student["status"]>("active");
  const [bulkClassId, setBulkClassId] = useState("");
  const [bulkDiscountType, setBulkDiscountType] = useState<DiscountType>("amount");
  const [bulkDiscountValue, setBulkDiscountValue] = useState(0);
  const [bulkMonth, setBulkMonth] = useState(new Date().toISOString().slice(0, 7));
  const [bulkPaymentStatus, setBulkPaymentStatus] =
    useState<"paid" | "pending" | "unpaid" | "refunded">("paid");

  const [editingStudent, setEditingStudent] = useState<StudentWithMeta | null>(null);
  const [editStatus, setEditStatus] = useState<Student["status"]>("active");
  const [editClassId, setEditClassId] = useState("");
  const [editBaseFee, setEditBaseFee] = useState(0);
  const [editDiscountType, setEditDiscountType] = useState<DiscountType>("none");
  const [editDiscountValue, setEditDiscountValue] = useState(0);
  const [editDiscountReason, setEditDiscountReason] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [paymentLogs, setPaymentLogs] = useState<
    { id: string; student_id: string | null; month_key: string; to_status: string; reason: string | null; created_at: string }[]
  >([]);
  const [memberLogs, setMemberLogs] = useState<
    { id: string; student_id: string; action: string; reason: string | null; created_at: string }[]
  >([]);

  const monthKeys = useMemo(
    () => Array.from({ length: 12 }).map((_, idx) => `${activeYear}-${String(idx + 1).padStart(2, "0")}`),
    [activeYear]
  );

  const loadClasses = async () => {
    const res = await authFetch("/api/classes");
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "반 정보를 불러오지 못했습니다.");
      return;
    }
    setClasses(
      (json.data ?? []).map((klass: { id: string; name: string; monthly_fee: number }) => ({
        id: klass.id,
        name: klass.name,
        monthly_fee: Number(klass.monthly_fee ?? 0),
      }))
    );
  };

  const loadStudents = async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (status) params.set("status", status);
    if (classId) params.set("classId", classId);
    if (paymentFilter) params.set("month", activeMonth);
    params.set("sort", "join_date.desc");
    params.set("includeSummary", "1");
    params.set("pageSize", "200");

    const res = await authFetch(`/api/students?${params.toString()}`);
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "회원 목록을 불러오지 못했습니다.");
      return;
    }

    const rows = (json.data ?? []) as StudentWithMeta[];
    const filtered =
      paymentFilter === ""
        ? rows
        : rows.filter((student) => {
            const monthPayment = student.payments?.find((p) => p.month_key === activeMonth);
            if (paymentFilter === "paid") return monthPayment?.status === "paid";
            if (paymentFilter === "unpaid") return !monthPayment || monthPayment.status !== "paid";
            return true;
          });
    setStudents(filtered);
    setSummary((json.summary ?? emptySummary) as Summary);
  };

  const loadLogs = async () => {
    const [paymentRes, memberRes] = await Promise.all([
      authFetch("/api/payments/change-logs?limit=10"),
      authFetch("/api/students/change-logs?limit=10"),
    ]);
    const paymentJson = await paymentRes.json();
    const memberJson = await memberRes.json();
    if (paymentRes.ok) setPaymentLogs(paymentJson.data ?? []);
    if (memberRes.ok) setMemberLogs(memberJson.data ?? []);
  };

  useEffect(() => {
    void loadClasses();
    void loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonth]);

  const createStudent = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const res = await authFetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "회원 생성 실패");
      return;
    }
    setCreateForm(initialCreateForm);
    setMessage("회원이 등록되었습니다.");
    await loadStudents();
  };

  const applyBulkAction = async () => {
    if (checkedIds.length === 0) {
      setError("일괄 작업할 회원을 선택해 주세요.");
      return;
    }
    const payload: Record<string, unknown> = { action: bulkAction, studentIds: checkedIds };
    if (bulkAction === "change_status") payload.status = bulkStatus;
    if (bulkAction === "change_class") payload.class_id = bulkClassId;
    if (bulkAction === "apply_discount") {
      payload.discount_type = bulkDiscountType;
      payload.discount_value = bulkDiscountValue;
    }
    if (bulkAction === "set_payment_status") {
      payload.month_key = bulkMonth;
      payload.payment_status = bulkPaymentStatus;
    }

    const res = await authFetch("/api/students/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "일괄 처리 실패");
      return;
    }
    setMessage(`일괄 처리 완료: ${json.affected}/${json.requested}`);
    await loadStudents();
    await loadLogs();
  };

  const toggleMonthPayment = async (student: StudentWithMeta, monthKey: string) => {
    const prev = student.payments?.find((p) => p.month_key === monthKey)?.status;
    const nextStatus = prev === "paid" ? "unpaid" : "paid";
    const enrollment = student.enrollments?.[0];
    const amountDue = Number(enrollment?.final_fee ?? enrollment?.monthly_fee ?? 0);
    const res = await authFetch(`/api/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payments: [
          {
            month_key: monthKey,
            amount_due: amountDue,
            status: nextStatus,
            payment_method: "manual",
            reason: "matrix_toggle",
          },
        ],
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "결제 상태 변경 실패");
      return;
    }
    setStudents((prevRows) => prevRows.map((row) => (row.id === student.id ? json.data : row)));
    await loadLogs();
  };

  const openEditModal = (student: StudentWithMeta) => {
    const enrollment = student.enrollments?.[0];
    setEditingStudent(student);
    setEditStatus(student.status);
    setEditClassId(enrollment?.class_id ?? "");
    setEditBaseFee(Number(enrollment?.monthly_fee ?? enrollment?.classes?.monthly_fee ?? 0));
    setEditDiscountType(enrollment?.discount_type ?? "none");
    setEditDiscountValue(Number(enrollment?.discount_value ?? 0));
    setEditDiscountReason(enrollment?.discount_reason ?? "");
    setEditNotes(student.notes ?? "");
  };

  const saveEditModal = async () => {
    if (!editingStudent) return;
    const finalFee = calculateFinalFee(editBaseFee, editDiscountType, editDiscountValue);
    const res = await authFetch(`/api/students/${editingStudent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: editStatus,
        notes: editNotes,
        enrollment: {
          class_id: editClassId,
          monthly_fee: editBaseFee,
          discount_type: editDiscountType,
          discount_value: editDiscountValue,
          discount_reason: editDiscountReason || null,
          final_fee: finalFee,
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "회원 수정 실패");
      return;
    }
    setEditingStudent(null);
    setStudents((prevRows) => prevRows.map((row) => (row.id === editingStudent.id ? json.data : row)));
    setMessage("회원 정보가 저장되었습니다.");
    await loadLogs();
  };

  const cardFilter = (type: "all" | "waiting" | "paid" | "unpaid" | string) => {
    if (type === "all") {
      setStatus("");
      setClassId("");
      setPaymentFilter("");
      void loadStudents();
      return;
    }
    if (type === "waiting") {
      setStatus("paused");
      setPaymentFilter("");
      void loadStudents();
      return;
    }
    if (type === "paid") {
      setPaymentFilter("paid");
      void loadStudents();
      return;
    }
    if (type === "unpaid") {
      setPaymentFilter("unpaid");
      void loadStudents();
      return;
    }
    setClassId(type);
    setPaymentFilter("");
    void loadStudents();
  };

  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-8">
      <h1 className="text-2xl font-semibold">회원 관리 통합 운영</h1>
      {error ? <p className="text-rose-500">{error}</p> : null}
      {message ? <p className="text-emerald-600">{message}</p> : null}

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryCard title="총 회원" value={`${summary.totalMembers}명`} onClick={() => cardFilter("all")} />
        <SummaryCard title="승인 대기(휴원)" value={`${summary.waitingMembers}명`} onClick={() => cardFilter("waiting")} />
        <SummaryCard title="이번달 결제 완료" value={`${summary.thisMonthPaid}명`} onClick={() => cardFilter("paid")} />
        <SummaryCard title="이번달 미결제" value={`${summary.thisMonthUnpaid}명`} onClick={() => cardFilter("unpaid")} />
      </section>

      <section className="rounded-xl border p-4 dark:border-zinc-800">
        <h2 className="mb-2 font-semibold">반별 인원 현황</h2>
        <div className="flex flex-wrap gap-2">
          {summary.classStats.map((row) => (
            <button
              key={row.classId}
              type="button"
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
              onClick={() => cardFilter(row.classId)}
            >
              {row.className} ({row.count}명)
            </button>
          ))}
        </div>
      </section>

      <form className="grid gap-3 rounded-xl border p-4 dark:border-zinc-800 md:grid-cols-5" onSubmit={createStudent}>
        <input className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" placeholder="이름" value={createForm.name} onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))} required />
        <input className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" placeholder="연락처" value={createForm.phone} onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))} required />
        <input className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" placeholder="학년" value={createForm.grade} onChange={(e) => setCreateForm((prev) => ({ ...prev, grade: e.target.value }))} required />
        <input type="date" className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={createForm.join_date} onChange={(e) => setCreateForm((prev) => ({ ...prev, join_date: e.target.value }))} />
        <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900">회원 추가</button>
      </form>

      <section className="grid gap-3 rounded-xl border p-4 dark:border-zinc-800 md:grid-cols-6">
        <input className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" placeholder="이름/연락처 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">전체 상태</option>
          <option value="active">재원중</option>
          <option value="paused">휴원</option>
          <option value="withdrawn">퇴원</option>
        </select>
        <select className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">전체 반</option>
          {classes.map((klass) => (
            <option key={klass.id} value={klass.id}>{klass.name}</option>
          ))}
        </select>
        <select className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
          <option value="">결제 전체</option>
          <option value="paid">이번달 결제 완료</option>
          <option value="unpaid">이번달 미결제</option>
        </select>
        <input type="month" className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={activeMonth} onChange={(e) => { setActiveMonth(e.target.value); setActiveYear(e.target.value.slice(0, 4)); }} />
        <button type="button" className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700" onClick={() => void loadStudents()}>
          {loading ? "조회 중..." : "검색"}
        </button>
      </section>

      <section className="grid gap-3 rounded-xl border p-4 dark:border-zinc-800 md:grid-cols-7">
        <select className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={bulkAction} onChange={(e) => setBulkAction(e.target.value as BulkAction)}>
          <option value="change_status">상태 일괄 변경</option>
          <option value="change_class">반 일괄 변경</option>
          <option value="apply_discount">할인 일괄 적용</option>
          <option value="set_payment_status">월 결제상태 일괄 처리</option>
        </select>
        <select className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as Student["status"])}>
          <option value="active">재원중</option>
          <option value="paused">휴원</option>
          <option value="withdrawn">퇴원</option>
        </select>
        <select className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={bulkClassId} onChange={(e) => setBulkClassId(e.target.value)}>
          <option value="">반 선택</option>
          {classes.map((klass) => (
            <option key={klass.id} value={klass.id}>{klass.name}</option>
          ))}
        </select>
        <select className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={bulkDiscountType} onChange={(e) => setBulkDiscountType(e.target.value as DiscountType)}>
          <option value="none">할인 없음</option>
          <option value="amount">정액 할인</option>
          <option value="percent">정률 할인</option>
        </select>
        <input type="number" className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" placeholder="할인값" value={bulkDiscountValue} onChange={(e) => setBulkDiscountValue(Number(e.target.value))} />
        <input type="month" className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={bulkMonth} onChange={(e) => setBulkMonth(e.target.value)} />
        <button type="button" className="rounded bg-zinc-900 px-3 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900" onClick={() => void applyBulkAction()}>
          선택 {checkedIds.length}명 일괄처리
        </button>
        <select className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700 md:col-start-6" value={bulkPaymentStatus} onChange={(e) => setBulkPaymentStatus(e.target.value as "paid" | "pending" | "unpaid" | "refunded")}>
          <option value="paid">결제완료</option>
          <option value="pending">진행중</option>
          <option value="unpaid">미결제</option>
          <option value="refunded">환불</option>
        </select>
      </section>

      <div className="overflow-x-auto rounded-xl border dark:border-zinc-800">
        <table className="min-w-[1600px] text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-900/60">
            <tr>
              <Th>
                <input type="checkbox" checked={students.length > 0 && checkedIds.length === students.length} onChange={(e) => setCheckedIds(e.target.checked ? students.map((s) => s.id) : [])} />
              </Th>
              <Th>이름</Th>
              <Th>소속 반</Th>
              <Th>연락처</Th>
              <Th>기본 수강료</Th>
              <Th>할인</Th>
              <Th>최종 수강료</Th>
              <Th>월별 결제</Th>
              <Th>상태</Th>
              <Th>관리</Th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const enrollment = student.enrollments?.[0];
              const baseFee = Number(enrollment?.monthly_fee ?? enrollment?.classes?.monthly_fee ?? 0);
              const discountType = enrollment?.discount_type ?? "none";
              const discountValue = Number(enrollment?.discount_value ?? 0);
              const finalFee = Number(
                enrollment?.final_fee ?? calculateFinalFee(baseFee, discountType, discountValue)
              );
              return (
                <tr key={student.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <Td>
                    <input
                      type="checkbox"
                      checked={checkedIds.includes(student.id)}
                      onChange={(e) =>
                        setCheckedIds((prev) =>
                          e.target.checked ? [...prev, student.id] : prev.filter((id) => id !== student.id)
                        )
                      }
                    />
                  </Td>
                  <Td>
                    <button type="button" className="underline" onClick={() => openEditModal(student)}>
                      {student.name}
                    </button>
                    <div className="text-xs opacity-70">
                      <Link href={`/students/${student.id}`}>상세 보기</Link>
                    </div>
                  </Td>
                  <Td>{enrollment?.classes?.name ?? "-"}</Td>
                  <Td>{student.phone}</Td>
                  <Td>{formatWon(baseFee)}</Td>
                  <Td>
                    {discountType === "none"
                      ? "-"
                      : discountType === "amount"
                        ? `${discountValue.toLocaleString("ko-KR")}원`
                        : `${discountValue}%`}
                  </Td>
                  <Td className="font-semibold">{formatWon(finalFee)}</Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      {monthKeys.map((key, idx) => {
                        const payment = student.payments?.find((p) => p.month_key === key);
                        const isPaid = payment?.status === "paid";
                        const isCurrent = key === activeMonth;
                        return (
                          <button
                            key={key}
                            type="button"
                            title={`${idx + 1}월: ${payment?.status ?? "unpaid"}`}
                            onClick={() => void toggleMonthPayment(student, key)}
                            className={`h-5 w-5 rounded text-[10px] ${
                              isPaid
                                ? "bg-emerald-500 text-white"
                                : isCurrent
                                  ? "bg-blue-500 text-white"
                                  : "bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                            }`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </Td>
                  <Td>{statusLabel(student.status)}</Td>
                  <Td>
                    <button
                      type="button"
                      className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                      onClick={() => openEditModal(student)}
                    >
                      수정
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingStudent ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <section className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-xl dark:bg-zinc-900">
            <h2 className="text-lg font-semibold">{editingStudent.name} 회원 정보 수정</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <select className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={editClassId} onChange={(e) => {
                const nextClassId = e.target.value;
                const found = classes.find((klass) => klass.id === nextClassId);
                setEditClassId(nextClassId);
                if (found) setEditBaseFee(found.monthly_fee);
              }}>
                <option value="">반 선택</option>
                {classes.map((klass) => (
                  <option key={klass.id} value={klass.id}>{klass.name}</option>
                ))}
              </select>
              <select className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={editStatus} onChange={(e) => setEditStatus(e.target.value as Student["status"])}>
                <option value="active">재원중</option>
                <option value="paused">휴원</option>
                <option value="withdrawn">퇴원</option>
              </select>
              <input type="number" className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={editBaseFee} onChange={(e) => setEditBaseFee(Number(e.target.value))} placeholder="기본 수강료" />
              <select className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={editDiscountType} onChange={(e) => setEditDiscountType(e.target.value as DiscountType)}>
                <option value="none">할인 없음</option>
                <option value="amount">정액 할인</option>
                <option value="percent">정률 할인</option>
              </select>
              <input type="number" className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={editDiscountValue} onChange={(e) => setEditDiscountValue(Number(e.target.value))} placeholder="할인 값" />
              <input className="rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" value={editDiscountReason} onChange={(e) => setEditDiscountReason(e.target.value)} placeholder="할인 사유" />
              <textarea className="md:col-span-2 rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="관리자 메모" />
            </div>
            <p className="mt-2 text-sm opacity-80">최종 수강료: {formatWon(calculateFinalFee(editBaseFee, editDiscountType, editDiscountValue))}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700" onClick={() => setEditingStudent(null)}>
                취소
              </button>
              <button type="button" className="rounded bg-zinc-900 px-3 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900" onClick={() => void saveEditModal()}>
                저장
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border p-4 dark:border-zinc-800">
          <h3 className="mb-2 font-semibold">최근 회원 변경 이력</h3>
          <ul className="space-y-1 text-sm">
            {memberLogs.map((log) => (
              <li key={log.id}>
                {new Date(log.created_at).toLocaleString("ko-KR")} · {log.action}
                {log.reason ? ` (${log.reason})` : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border p-4 dark:border-zinc-800">
          <h3 className="mb-2 font-semibold">최근 결제 변경 이력</h3>
          <ul className="space-y-1 text-sm">
            {paymentLogs.map((log) => (
              <li key={log.id}>
                {new Date(log.created_at).toLocaleString("ko-KR")} · {log.month_key} · {log.to_status}
                {log.reason ? ` (${log.reason})` : ""}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function statusLabel(status: Student["status"]) {
  if (status === "active") return "재원중";
  if (status === "paused") return "휴원";
  if (status === "withdrawn") return "퇴원";
  return status;
}

function SummaryCard({ title, value, onClick }: { title: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-zinc-200 p-4 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/40">
      <p className="text-sm opacity-75">{title}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </button>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium">{children}</th>;
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={className ? `px-3 py-2 align-top ${className}` : "px-3 py-2 align-top"}>{children}</td>;
}
