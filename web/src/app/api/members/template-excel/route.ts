import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { requireRole } from "@/lib/auth/guards";

// 로컬 개발용: 사용자 PC 바탕화면에 있는 템플릿 파일 경로
const LOCAL_TEMPLATE_PATH =
  "c:/Users/user/OneDrive/바탕 화면/템플릿.xlsx";

export async function GET() {
  const guard = await requireRole(["admin", "teacher"]);
  if (!guard.ok) return guard.response;

  try {
    const fileBuffer = await readFile(LOCAL_TEMPLATE_PATH);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="회원-일괄등록-템플릿.xlsx"',
      },
    });
  } catch (error) {
    console.error("Failed to read Excel template:", error);
    return NextResponse.json(
      { error: "엑셀 템플릿 파일을 읽지 못했습니다. 경로를 확인해 주세요." },
      { status: 500 },
    );
  }
}

