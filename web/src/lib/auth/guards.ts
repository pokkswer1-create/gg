import { getSupabaseServer } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
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

  const supabaseServer = getSupabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabaseServer.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabaseServer
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
