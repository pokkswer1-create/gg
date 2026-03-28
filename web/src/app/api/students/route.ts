import { requireRole } from "@/lib/auth/guards";
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
  const sort = searchParams.get("sort") ?? "join_date.desc";

  let builder = supabaseServer.from("students").select(`
    *,
    enrollments(
      id,
      class_id,
      monthly_fee,
      classes(id, name, teacher_name, monthly_fee)
    ),
    payments(id, month_key, amount_due, amount_paid, status, paid_at)
  `);

  if (query) {
    builder = builder.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);
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

  const { data, error } = await builder;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
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
    const monthlyFee = Number(body.monthly_fee ?? 0);
    await supabaseServer.from("enrollments").upsert(
      {
        student_id: data.id,
        class_id: body.class_id,
        monthly_fee: monthlyFee,
      },
      { onConflict: "student_id,class_id" }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
