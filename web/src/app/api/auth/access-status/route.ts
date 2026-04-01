import { getSupabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;
  if (!bearer) {
    return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: "Supabase 환경변수가 필요합니다." }, { status: 500 });
  }

  const authClient = createClient(url, anon);
  const {
    data: { user },
    error: userErr,
  } = await authClient.auth.getUser(bearer);
  if (userErr || !user) {
    return NextResponse.json({ error: "유효하지 않은 세션입니다." }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, role, approved")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  if (!profile) {
    const fullName = (user.email || "new-user").split("@")[0];
    const { error: createErr } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: fullName,
      email: user.email ?? null,
      role: "teacher",
      approved: false,
    });
    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }
    return NextResponse.json({ approved: false, role: "teacher", email: user.email ?? null });
  }

  return NextResponse.json({
    approved: profile.approved !== false,
    role: profile.role,
    email: user.email ?? null,
  });
}

