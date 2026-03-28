import { requireRole } from "@/lib/auth/guards";
import * as XLSX from "xlsx";

export async function GET() {
  const guard = await requireRole(["admin", "teacher"]);
  if (!guard.ok) return guard.response;

  const rows = [
    {
      studentName: "홍길동",
      grade: "초5",
      phone: "010-1234-5678",
      classId: "",
      startDate: "2026-01-10",
      status: "active",
      monthlyFee: 180000,
    },
    {
      studentName: "김영희",
      grade: "중1",
      phone: "010-2345-6789",
      classId: "",
      startDate: "2026-01-10",
      status: "active",
      monthlyFee: 200000,
    },
  ];

  const guide = [
    {
      column: "studentName",
      description: "필수, 학생 이름",
    },
    {
      column: "grade",
      description: "필수, 예: 초3/중1",
    },
    {
      column: "phone",
      description: "필수, 학생 연락처",
    },
    {
      column: "classId",
      description: "선택, 수업 ID (비우면 미배정)",
    },
    {
      column: "startDate",
      description: "선택, YYYY-MM-DD (비우면 오늘)",
    },
    {
      column: "status",
      description: "선택, active/break/withdrawn",
    },
    {
      column: "monthlyFee",
      description: "선택, classId가 있을 때 월 수강료",
    },
  ];

  const wb = XLSX.utils.book_new();
  const wsRows = XLSX.utils.json_to_sheet(rows);
  const wsGuide = XLSX.utils.json_to_sheet(guide);
  XLSX.utils.book_append_sheet(wb, wsRows, "members_template");
  XLSX.utils.book_append_sheet(wb, wsGuide, "guide");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="members-template.xlsx"`,
    },
  });
}
