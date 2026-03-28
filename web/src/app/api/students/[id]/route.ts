import { requireRole } from "@/lib/auth/guards";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  const guard = await requireRole(["admin", "teacher"]);
  if (!guard.ok) return guard.response;

  const supabaseServer = getSupabaseServer();
  const { id } = await context.params;
  const { data, error } = await supabaseServer
    .from("students")
    .select(
      `
      *,
      enrollments (
        id,
        class_id,
        classes (id, name, teacher_name, class_type)
      ),
      attendance_records (id, class_date, status, reason, makeup_status),
      payments (id, month_key, amount_due, amount_paid, status, paid_at),
      member_histories (id, action, note, created_at)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function PATCH(request: Request, context: Context) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const supabaseServer = getSupabaseServer();
  const { id } = await context.params;
  const body = await request.json();

  const { data, error } = await supabaseServer
    .from("students")
    .update(body)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}
