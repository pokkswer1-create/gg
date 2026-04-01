import { isApproverAuthorized } from "@/lib/auth/approver";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (!isApproverAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, approved, created_at, approved_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    pending: (data ?? []).filter((x) => x.approved === false),
    approved: (data ?? []).filter((x) => x.approved !== false),
  });
}

