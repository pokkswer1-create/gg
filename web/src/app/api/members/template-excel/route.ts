import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import * as XLSX from "xlsx";

export async function GET() {
  const guard = await requireRole(["admin", "teacher"]);
  if (!guard.ok) return guard.response;

  try {
    const rows = [
      {
        name: "홍길동",
        phone: "010-1234-5678",
        grade: "초5",
        status: "active",
        className: "유소년 A반",
        monthlyFee: 180000,
        parentName: "홍부모",
        parentPhone: "010-8765-4321",
        fatherPhone: "010-1111-2222",
        motherPhone: "010-3333-4444",
        joinDate: new Date().toISOString().slice(0, 10),
      },
    ];
    const guideRows = [
      { field: "name", required: "Y", description: "학생 이름" },
      { field: "phone", required: "Y", description: "학생 연락처 (예: 010-1234-5678)" },
      { field: "grade", required: "Y", description: "학년/학부 (예: 초5)" },
      { field: "status", required: "N", description: "active | paused | withdrawn (기본 active)" },
      { field: "className", required: "N", description: "반 이름(기존 반과 매칭될 때 자동 등록)" },
      { field: "monthlyFee", required: "N", description: "월 수강료 숫자 (예: 180000)" },
      { field: "parentName", required: "N", description: "학부모 이름" },
      { field: "parentPhone", required: "N", description: "학부모 연락처" },
      { field: "fatherPhone", required: "N", description: "부(아버지) 연락처 - 발송 우선" },
      { field: "motherPhone", required: "N", description: "모(어머니) 연락처" },
      { field: "joinDate", required: "N", description: "가입일 YYYY-MM-DD (기본 오늘)" },
    ];

    const wb = XLSX.utils.book_new();
    const dataWs = XLSX.utils.json_to_sheet(rows);
    const guideWs = XLSX.utils.json_to_sheet(guideRows);
    XLSX.utils.book_append_sheet(wb, dataWs, "members_template");
    XLSX.utils.book_append_sheet(wb, guideWs, "guide");
    const fileBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="members-template.xlsx"; filename*=UTF-8\'\'%ED%9A%8C%EC%9B%90-%EC%9D%BC%EA%B4%84%EB%93%B1%EB%A1%9D-%ED%85%9C%ED%94%8C%EB%A6%BF.xlsx',
      },
    });
  } catch (error) {
    console.error("Failed to generate Excel template:", error);
    return NextResponse.json(
      { error: "엑셀 템플릿 파일 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}

