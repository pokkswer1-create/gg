export function isApproverAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization") || "";
  const token = auth.match(/^Basic\s+(.+)$/i)?.[1];
  if (!token) return false;

  let raw = "";
  try {
    raw = Buffer.from(token, "base64").toString("utf8");
  } catch {
    return false;
  }

  const idx = raw.indexOf(":");
  if (idx < 0) return false;
  const id = raw.slice(0, idx);
  const password = raw.slice(idx + 1);

  const expectedId = process.env.APPROVER_ADMIN_ID || "pokkswer";
  const expectedPassword = process.env.APPROVER_ADMIN_PASSWORD || "강선00!!";

  return id === expectedId && password === expectedPassword;
}

