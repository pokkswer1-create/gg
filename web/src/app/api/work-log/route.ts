import { requireRole } from "@/lib/auth/guards";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const guard = await requireRole(["admin", "teacher"]);
  if (!guard.ok) return guard.response;
  const supabaseServer = getSupabaseServer();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const instructorId = searchParams.get("instructorId");
  let builder = supabaseServer
    .from("teacher_journals")
    .select("id, category, content, created_at, teacher_profile_id")
    .order("created_at", { ascending: false });
  if (month) {
    builder = builder
      .gte("created_at", `${month}-01T00:00:00`)
      .lte("created_at", `${month}-31T23:59:59`);
  }
  if (instructorId) builder = builder.eq("teacher_profile_id", instructorId);
  const { data, error } = await builder;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
