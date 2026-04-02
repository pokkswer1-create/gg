import { requireRole } from "@/lib/auth/guards";
import { calculateFinalFee } from "@/lib/tuition";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type BulkAction =
  | "change_class"
  | "change_status"
  | "apply_discount"
  | "set_payment_status";

export async function PATCH(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => ({}))) as {
    action: BulkAction;
    studentIds: string[];
    class_id?: string;
    status?: "active" | "paused" | "withdrawn";
    discount_type?: "none" | "amount" | "percent";
    discount_value?: number;
    discount_reason?: string | null;
    month_key?: string;
    payment_status?: "paid" | "pending" | "unpaid" | "refunded";
    reason?: string;
  };

  const studentIds = Array.from(new Set((body.studentIds ?? []).filter(Boolean)));
  if (!body.action || studentIds.length === 0) {
    return NextResponse.json({ error: "action, studentIds가 필요합니다." }, { status: 400 });
  }

  const supabaseServer = getSupabaseServer();
  let affected = 0;
  const failed: Array<{ studentId: string; reason: string }> = [];

  for (const studentId of studentIds) {
    try {
      if (body.action === "change_status" && body.status) {
        const res = await supabaseServer
          .from("students")
          .update({ status: body.status })
          .eq("id", studentId);
        if (res.error) throw new Error(res.error.message);
      }

      if (body.action === "change_class" && body.class_id) {
        const current = await supabaseServer
          .from("enrollments")
          .select("monthly_fee, discount_type, discount_value, discount_reason, discount_start_date, discount_end_date")
          .eq("student_id", studentId)
          .order("enrolled_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (current.error) throw new Error(current.error.message);
        const monthlyFee = Number(current.data?.monthly_fee ?? 0);
        const discountType = current.data?.discount_type ?? "none";
        const discountValue = Number(current.data?.discount_value ?? 0);
        const finalFee = calculateFinalFee(monthlyFee, discountType, discountValue);
        const res = await supabaseServer.from("enrollments").upsert(
          {
            student_id: studentId,
            class_id: body.class_id,
            monthly_fee: monthlyFee,
            discount_type: discountType,
            discount_value: discountValue,
            discount_reason: current.data?.discount_reason ?? null,
            discount_start_date: current.data?.discount_start_date ?? null,
            discount_end_date: current.data?.discount_end_date ?? null,
            final_fee: finalFee,
          },
          { onConflict: "student_id,class_id" }
        );
        if (res.error) throw new Error(res.error.message);
      }

      if (body.action === "apply_discount") {
        const enrollment = await supabaseServer
          .from("enrollments")
          .select("id, class_id, monthly_fee")
          .eq("student_id", studentId)
          .order("enrolled_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (enrollment.error) throw new Error(enrollment.error.message);
        if (!enrollment.data) throw new Error("수강 정보 없음");
        const discountType = body.discount_type ?? "none";
        const discountValue = Number(body.discount_value ?? 0);
        const finalFee = calculateFinalFee(Number(enrollment.data.monthly_fee ?? 0), discountType, discountValue);
        const res = await supabaseServer
          .from("enrollments")
          .update({
            discount_type: discountType,
            discount_value: discountValue,
            discount_reason: body.discount_reason ?? null,
            final_fee: finalFee,
          })
          .eq("id", enrollment.data.id);
        if (res.error) throw new Error(res.error.message);
      }

      if (body.action === "set_payment_status" && body.month_key && body.payment_status) {
        const enrollment = await supabaseServer
          .from("enrollments")
          .select("final_fee, monthly_fee")
          .eq("student_id", studentId)
          .order("enrolled_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (enrollment.error) throw new Error(enrollment.error.message);
        const amountDue = Number(enrollment.data?.final_fee ?? enrollment.data?.monthly_fee ?? 0);
        const amountPaid = body.payment_status === "paid" ? amountDue : 0;
        const upsertRes = await supabaseServer
          .from("payments")
          .upsert(
            {
              student_id: studentId,
              month_key: body.month_key,
              amount_due: amountDue,
              amount_paid: amountPaid,
              status: body.payment_status,
              payment_method: "manual",
              updated_by: guard.userId,
              status_changed_at: new Date().toISOString(),
              paid_at: body.payment_status === "paid" ? new Date().toISOString() : null,
            },
            { onConflict: "student_id,month_key" }
          )
          .select("id")
          .single();
        if (upsertRes.error) throw new Error(upsertRes.error.message);

        await supabaseServer.from("payment_change_logs").insert({
          payment_id: upsertRes.data.id,
          student_id: studentId,
          actor_profile_id: guard.userId,
          month_key: body.month_key,
          to_status: body.payment_status,
          amount_due: amountDue,
          amount_paid: amountPaid,
          reason: body.reason ?? null,
        });
      }

      await supabaseServer.from("member_change_logs").insert({
        student_id: studentId,
        actor_profile_id: guard.userId,
        action: `bulk_${body.action}`,
        reason: body.reason ?? null,
        before_data: {},
        after_data: body,
      });
      affected += 1;
    } catch (error) {
      failed.push({
        studentId,
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    action: body.action,
    requested: studentIds.length,
    affected,
    failed,
  });
}
