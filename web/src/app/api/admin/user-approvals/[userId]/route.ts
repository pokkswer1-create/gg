import { isApproverAuthorized } from "@/lib/auth/approver";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ userId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!isApproverAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const body = await request.json().catch(() => ({}));
  const approve = Boolean(body?.approve);
  const role = body?.role === "admin" ? "admin" : "teacher";

  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("profiles")
    .update({
      approved: approve,
      role,
      approved_at: approve ? new Date().toISOString() : null,
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

