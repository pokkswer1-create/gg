import { requireRole } from "@/lib/auth/guards";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const guard = await requireRole(["admin", "teacher"]);
  if (!guard.ok) return guard.response;
  const month = new URL(request.url).searchParams.get("month");
  const supabaseServer = getSupabaseServer();
  let builder = supabaseServer.from("expenses").select("*").order("expense_date", { ascending: false });
  if (month) {
    builder = builder.gte("expense_date", `${month}-01`).lte("expense_date", `${month}-31`);
  }
  const { data, error } = await builder;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
