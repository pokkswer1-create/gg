import { requireRole } from "@/lib/auth/guards";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const guard = await requireRole(["admin", "teacher"]);
  if (!guard.ok) return guard.response;

  const supabaseServer = getSupabaseServer();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const status = searchParams.get("status");
  const classId = searchParams.get("classId");
  const instructor = searchParams.get("instructor");

  let builder = supabaseServer
    .from("payments")
    .select(
      "*, students(id, name, grade, parent_name, parent_phone, enrollments(class_id, classes(id, name, teacher_name)))"
    )
    .order("created_at", { ascending: false });

  if (month) {
    builder = builder.eq("month_key", month);
  }
  if (status) {
    builder = builder.eq("status", status);
  }

  const { data, error } = await builder;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filtered =
    data?.filter((item) => {
      const enrollments = (item.students as { enrollments?: { class_id?: string; classes?: { teacher_name?: string } | null }[] } | null)
        ?.enrollments;
      const classMatch =
        !classId || enrollments?.some((enrollment) => enrollment.class_id === classId);
      const instructorMatch =
        !instructor ||
        enrollments?.some((enrollment) =>
          (enrollment.classes?.teacher_name ?? "").includes(instructor)
        );
      return classMatch && instructorMatch;
    }) ?? [];

  return NextResponse.json({ data: filtered });
}

export async function POST(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const supabaseServer = getSupabaseServer();
  const body = await request.json();
  const payload = {
    student_id: body.student_id,
    month_key: body.month_key,
    amount_due: Number(body.amount_due),
    amount_paid: Number(body.amount_paid ?? 0),
    status: body.status ?? "pending",
    paid_at: body.paid_at ?? null,
  };

  const { data, error } = await supabaseServer
    .from("payments")
    .upsert(payload, { onConflict: "student_id,month_key" })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
