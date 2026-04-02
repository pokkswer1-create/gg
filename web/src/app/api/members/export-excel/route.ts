import { requireRole } from "@/lib/auth/guards";
import { getSupabaseServerWithAuth } from "@/lib/supabase/server-auth";
import { NextRequest } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  const guard = await requireRole(["admin", "teacher"]);
  if (!guard.ok) return guard.response;

  const supabaseServer = getSupabaseServerWithAuth(request.headers.get("authorization"));
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let builder = supabaseServer
    .from("students")
    .select(
      "id, name, grade, phone, parent_name, parent_phone, father_phone, mother_phone, join_date, status, enrollments(monthly_fee, classes(name))"
    )
    .order("join_date", { ascending: false });
  if (status) builder = builder.eq("status", status === "break" ? "paused" : status);

  const { data, error } = await builder;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const rows =
    data?.map((row) => ({
      // Supabase nested relation type can vary by project metadata.
      className: (() => {
        const classesValue = (row.enrollments?.[0] as { classes?: unknown } | undefined)?.classes;
        if (Array.isArray(classesValue)) {
          return (classesValue[0] as { name?: string } | undefined)?.name ?? "";
        }
        return (classesValue as { name?: string } | undefined)?.name ?? "";
      })(),
      studentName: row.name,
      grade: row.grade,
      phone: row.phone,
      parentName: row.parent_name ?? "",
      parentPhone: row.parent_phone ?? "",
      fatherPhone: row.father_phone ?? "",
      motherPhone: row.mother_phone ?? "",
      startDate: row.join_date,
      status: row.status,
      monthlyFee: row.enrollments?.[0]?.monthly_fee ?? 0,
    })) ?? [];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "members");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="members-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`,
    },
  });
}
