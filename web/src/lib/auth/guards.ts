import type { UserRole } from "@/lib/types";
import { getSupabaseServer } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type GuardSuccess = {
  ok: true;
  userId: string;
  role: UserRole;
};

type GuardFail = {
  ok: false;
  response: NextResponse;
};

export async function requireRole(allowedRoles: UserRole[]): Promise<GuardSuccess | GuardFail> {
  if (process.env.NEXT_PUBLIC_BYPASS_AUTH === "true") {
    return {
      ok: true,
      userId: "dev-bypass-user",
      role: allowedRoles.includes("admin") ? "admin" : "teacher",
    };
  }

  const h = await headers();
  const authHeader = h.get("authorization");
  const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;

  if (!bearer) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "로그인이 필요합니다. /auth 에서 로그인한 뒤 다시 시도하세요." },
        { status: 401 }
      ),
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return {
      ok: false,
      response: NextResponse.json({ error: "서버 환경 변수가 설정되지 않았습니다." }, { status: 500 }),
    };
  }

  const authClient = createClient(url, anon);
  const {
    data: { user },
    error: authErr,
  } = await authClient.auth.getUser(bearer);

  if (authErr || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "세션이 만료되었거나 유효하지 않습니다. 다시 로그인하세요." },
        { status: 401 }
      ),
    };
  }

  const supabase = getSupabaseServer();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.role) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Profile role not found" }, { status: 403 }),
    };
  }

  if (!allowedRoles.includes(profile.role as UserRole)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    userId: user.id,
    role: profile.role as UserRole,
  };
}
