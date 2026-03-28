import { requireRole } from "@/lib/auth/guards";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const guard = await requireRole(["admin", "teacher"]);
  if (!guard.ok) return guard.response;

  const supabaseServer = getSupabaseServer();
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const month = searchParams.get("month");

  let builder = supabaseServer
    .from("attendance_audit_log")
    .select("*")
    .order("created_at", { ascending: false });
  if (classId) builder = builder.eq("class_id", classId);
  if (month) {
    builder = builder
      .gte("created_at", `${month}-01T00:00:00`)
      .lte("created_at", `${month}-31T23:59:59`);
  }
  const { data, error } = await builder;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
