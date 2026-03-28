import { requireRole } from "@/lib/auth/guards";
import { mockEmailProvider } from "@/lib/providers/email/mock";
import { mockNotificationProvider } from "@/lib/providers/notification/mock";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;
  const { announcementId, memberIds, channel } = await request.json();
  if (!announcementId || !Array.isArray(memberIds)) {
    return NextResponse.json({ error: "announcementId/memberIds가 필요합니다." }, { status: 400 });
  }

  const supabaseServer = getSupabaseServer();
  const [{ data: announcement }, { data: link }] = await Promise.all([
    supabaseServer.from("class_announcements").select("id, title").eq("id", announcementId).single(),
    supabaseServer
      .from("class_application_links")
      .select("short_url, external_form_url")
      .eq("announcement_id", announcementId)
      .maybeSingle(),
  ]);
  if (!announcement) return NextResponse.json({ error: "안내를 찾을 수 없습니다." }, { status: 404 });

  const { data: members, error: memberError } = await supabaseServer
    .from("students")
    .select("id, name, parent_phone, email")
    .in("id", memberIds);
  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

  let sentCount = 0;
  let failCount = 0;
  const url = link?.short_url ?? link?.external_form_url ?? "";
  for (const member of members ?? []) {
    try {
      if (channel === "email" && member.email) {
        await mockEmailProvider.send({
          to: member.email,
          subject: `[안내] ${announcement.title}`,
          html: `<p>${member.name}님 안내입니다.</p><p><a href="${url}">${url}</a></p>`,
        });
      } else {
        await mockNotificationProvider.send({
          to: member.parent_phone ?? "",
          title: announcement.title,
          body: `${member.name}님 안내 링크: ${url}`,
        });
      }
      sentCount += 1;
    } catch {
      failCount += 1;
    }
  }

  await supabaseServer.from("announcement_send_logs").insert({
    announcement_id: announcementId,
    class_id: null,
    member_ids: memberIds,
    channel: channel ?? "kakao",
    sent_count: sentCount,
    fail_count: failCount,
    sent_by_admin_id: guard.userId,
  });

  return NextResponse.json({ success: true, sentCount, failCount });
}
