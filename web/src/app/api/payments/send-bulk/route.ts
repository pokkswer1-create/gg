import { requireRole } from "@/lib/auth/guards";
import { mockNotificationProvider } from "@/lib/providers/notification/mock";
import { mockPaymentProvider } from "@/lib/providers/payment/mock";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const { memberIds, month, channel } = await request.json();
  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    return NextResponse.json({ error: "memberIds가 필요합니다." }, { status: 400 });
  }

  const supabaseServer = getSupabaseServer();
  const monthKey = month ?? new Date().toISOString().slice(0, 7);
  let sent = 0;
  let failed = 0;

  for (const studentId of memberIds) {
    const { data: payment } = await supabaseServer
      .from("payments")
      .select("id, amount_due, status, students(name, father_phone, mother_phone, parent_phone)")
      .eq("student_id", studentId)
      .eq("month_key", monthKey)
      .maybeSingle();
    if (!payment) {
      failed += 1;
      continue;
    }
    const parentPhone =
      (
        payment.students as {
          father_phone?: string;
          mother_phone?: string;
          parent_phone?: string;
        } | null
      )?.father_phone ??
      (payment.students as { parent_phone?: string } | null)?.parent_phone ??
      (payment.students as { mother_phone?: string } | null)?.mother_phone ??
      "";
    const studentName = (payment.students as { name?: string } | null)?.name ?? "학생";
    const paymentLink = await mockPaymentProvider.createPaymentLink({
      studentId,
      amount: Number(payment.amount_due ?? 0),
      monthKey,
    });
    await mockNotificationProvider.send({
      to: parentPhone,
      title: "결제 안내",
      body: `${studentName} ${monthKey} 수강료 안내 (${channel ?? "kakao"})\n결제 링크: ${paymentLink.paymentUrl}`,
    });
    sent += 1;
  }

  return NextResponse.json({ sent, failed });
}
