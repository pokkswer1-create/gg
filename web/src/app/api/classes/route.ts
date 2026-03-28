import { requireRole } from "@/lib/auth/guards";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const guard = await requireRole(["admin", "teacher"]);
  if (!guard.ok) return guard.response;

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer
    .from("classes")
    .select("*, enrollments(id, student_id, students(id, name, grade))")
    .order("created_at", { ascending: false });
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
    teacher_name: body.teacher_name,
    class_type: body.class_type,
    days_of_week: body.days_of_week ?? [],
    start_time: body.start_time,
    end_time: body.end_time,
    monthly_fee: Number(body.monthly_fee ?? 0),
    monthly_sessions: Number(body.monthly_sessions ?? 0),
    capacity: Number(body.capacity ?? 0),
    class_status: body.class_status ?? "active",
  };

  const { data, error } = await supabaseServer
    .from("classes")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201 });
}
