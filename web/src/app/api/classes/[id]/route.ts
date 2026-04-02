import { requireRole } from "@/lib/auth/guards";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const body = await request.json();
  const monthlySessions = Number(body.monthly_sessions ?? 0);
  const feeMode = body.fee_mode ?? "monthly_fixed";
  const feePerSession = Number(body.fee_per_session ?? 0);
  const monthlyFee =
    feeMode === "per_session"
      ? feePerSession * monthlySessions
      : Number(body.monthly_fee ?? 0);

  if (monthlyFee <= 0) {
    return NextResponse.json({ error: "수강료는 0원보다 커야 합니다." }, { status: 400 });
  }

  const supabaseServer = getSupabaseServer();
  const patch: Record<string, unknown> = {
    name: body.name,
    teacher_name: body.teacher_name,
    class_type: body.class_type,
    class_category: body.class_category ?? "general",
    days_of_week: body.days_of_week ?? [],
    start_time: body.start_time,
    end_time: body.end_time,
    fee_mode: feeMode,
    fee_per_session: feePerSession,
    monthly_fee: monthlyFee,
    monthly_sessions: monthlySessions,
    capacity: Number(body.capacity ?? 0),
    is_active: body.is_active ?? true,
  };
  if (body.class_status) {
    patch.class_status = body.class_status;
  }

  const { data, error } = await supabaseServer
    .from("classes")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(_request: Request, context: Context) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  const supabaseServer = getSupabaseServer();
  const { error } = await supabaseServer.from("classes").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
