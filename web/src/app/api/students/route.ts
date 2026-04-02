import { requireRole } from "@/lib/auth/guards";
import { calculateFinalFee } from "@/lib/tuition";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const guard = await requireRole(["admin", "teacher"]);
  if (!guard.ok) return guard.response;

  const supabaseServer = getSupabaseServer();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const status = searchParams.get("status");
  const grade = searchParams.get("grade");
  const classId = searchParams.get("classId");
  const month = searchParams.get("month");
  const includeSummary = searchParams.get("includeSummary") === "1";
  const page = Math.max(Number(searchParams.get("page") ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") ?? 100), 1), 300);
  const sort = searchParams.get("sort") ?? "join_date.desc";

  let builder = supabaseServer.from("students").select(`
    *,
    enrollments(
      id,
      class_id,
      monthly_fee,
      discount_type,
      discount_value,
      discount_reason,
      discount_start_date,
      discount_end_date,
      final_fee,
      classes(id, name, teacher_name, class_type, monthly_fee, monthly_sessions)
    ),
    payments(id, month_key, amount_due, amount_paid, status, paid_at, payment_method, notes, status_changed_at)
  `);

  if (query) {
    builder = builder.or(
      `name.ilike.%${query}%,phone.ilike.%${query}%,parent_phone.ilike.%${query}%,father_phone.ilike.%${query}%,mother_phone.ilike.%${query}%`
    );
  }
  if (status) {
    const mappedStatus = status === "break" ? "paused" : status;
    builder = builder.eq("status", mappedStatus);
  }
  if (grade) {
    builder = builder.eq("grade", grade);
  }
  if (classId) {
    builder = builder.eq("enrollments.class_id", classId);
  }
  if (month) {
    builder = builder.eq("payments.month_key", month);
  }

  const [column, direction] = sort.split(".");
  builder = builder.order(column, { ascending: direction !== "desc" });
  builder = builder.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error } = await builder;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((student) => {
    const firstEnrollment = student.enrollments?.[0];
    if (firstEnrollment) {
      const baseFee = Number(firstEnrollment.monthly_fee ?? firstEnrollment.classes?.monthly_fee ?? 0);
      const finalFee = calculateFinalFee(
        baseFee,
        firstEnrollment.discount_type ?? "none",
        Number(firstEnrollment.discount_value ?? 0)
      );
      if (!firstEnrollment.final_fee || Number(firstEnrollment.final_fee) !== finalFee) {
        firstEnrollment.final_fee = finalFee;
      }
    }
    return student;
  });

  if (!includeSummary) {
    return NextResponse.json({ data: items });
  }

  const monthKey = month ?? new Date().toISOString().slice(0, 7);
  const thisMonthPaid = items.filter((student) =>
    (student.payments ?? []).some((payment) => payment.month_key === monthKey && payment.status === "paid")
  ).length;
  const waitingCount = items.filter((student) => student.status === "paused").length;
  const classStats = new Map<string, { classId: string; className: string; count: number }>();
  for (const student of items) {
    for (const enrollment of student.enrollments ?? []) {
      if (!enrollment.classes?.id) continue;
      const current = classStats.get(enrollment.classes.id) ?? {
        classId: enrollment.classes.id,
        className: enrollment.classes.name,
        count: 0,
      };
      current.count += 1;
      classStats.set(enrollment.classes.id, current);
    }
  }

  return NextResponse.json({
    data: items,
    summary: {
      totalMembers: items.length,
      waitingMembers: waitingCount,
      thisMonthPaid,
      thisMonthUnpaid: Math.max(items.length - thisMonthPaid, 0),
      classStats: Array.from(classStats.values()).sort((a, b) => b.count - a.count),
      page,
      pageSize,
    },
  });
}

export async function POST(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const supabaseServer = getSupabaseServer();
  const body = await request.json();
  const payload = {
    name: body.name,
    phone: body.phone,
    email: body.email || null,
    birth_date: body.birth_date || null,
    grade: body.grade,
    status: body.status ?? "active",
    join_date: body.join_date,
    parent_name: body.parent_name || null,
    parent_phone: body.parent_phone || null,
    father_phone: body.father_phone || null,
    mother_phone: body.mother_phone || null,
    notes: body.notes || null,
  };

  const { data, error } = await supabaseServer
    .from("students")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.class_id) {
    const discountType = body.discount_type ?? "none";
    const discountValue = Number(body.discount_value ?? 0);
    const monthlyFee = Number(body.monthly_fee ?? 0);
    const finalFee = calculateFinalFee(monthlyFee, discountType, discountValue);
    await supabaseServer.from("enrollments").upsert(
      {
        student_id: data.id,
        class_id: body.class_id,
        monthly_fee: monthlyFee,
        discount_type: discountType,
        discount_value: discountValue,
        discount_reason: body.discount_reason ?? null,
        discount_start_date: body.discount_start_date ?? null,
        discount_end_date: body.discount_end_date ?? null,
        final_fee: finalFee,
      },
      { onConflict: "student_id,class_id" }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const { memberIds } = (await request.json().catch(() => ({}))) as { memberIds?: string[] };
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return NextResponse.json({ error: "memberIds가 필요합니다." }, { status: 400 });
  }

  const supabaseServer = getSupabaseServer();
  const uniqueIds = Array.from(new Set(memberIds.filter(Boolean)));
  const { data, error } = await supabaseServer
    .from("students")
    .delete()
    .in("id", uniqueIds)
    .select("id");

  if (error) {
    return NextResponse.json({ error: `선택 회원 삭제 실패: ${error.message}` }, { status: 500 });
  }

  const deleted = (data ?? []).length;
  const failed = Math.max(uniqueIds.length - deleted, 0);
  return NextResponse.json({
    ok: failed === 0,
    deleted,
    failed,
  });
}
