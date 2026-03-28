import { requireRole } from "@/lib/auth/guards";
import { getSupabaseServer } from "@/lib/supabase/server";
import * as XLSX from "xlsx";
import { NextResponse } from "next/server";

type InputRow = {
  studentName?: string;
  grade?: string;
  phone?: string;
  classId?: string;
  startDate?: string;
  status?: string;
  monthlyFee?: number;
};

export async function POST(request: Request) {
  const guard = await requireRole(["admin"]);
  if (!guard.ok) return guard.response;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, message: "파일이 필요합니다." }, { status: 400 });
  }

  const supabaseServer = getSupabaseServer();
  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<InputRow>(sheet, { defval: "" });

  let imported = 0;
  const errors: { row: number; reason: string }[] = [];

  for (let idx = 0; idx < rows.length; idx += 1) {
    const row = rows[idx];
    if (!row.studentName || !row.phone || !row.grade) {
      errors.push({ row: idx + 2, reason: "필수 컬럼 누락(studentName/phone/grade)" });
      continue;
    }

    const status = (row.status || "active").toString();
    const mappedStatus = status === "break" ? "paused" : status;

    const { data: student, error } = await supabaseServer
      .from("students")
      .insert({
        name: row.studentName,
        phone: row.phone,
        grade: row.grade,
        status: mappedStatus,
        join_date: row.startDate || new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();

    if (error || !student) {
      errors.push({ row: idx + 2, reason: error?.message ?? "등록 실패" });
      continue;
    }

    if (row.classId) {
      await supabaseServer.from("enrollments").upsert(
        {
          student_id: student.id,
          class_id: row.classId,
          monthly_fee: Number(row.monthlyFee ?? 0),
        },
        { onConflict: "student_id,class_id" }
      );
    }

    imported += 1;
  }

  return NextResponse.json({ success: true, imported, errors });
}
