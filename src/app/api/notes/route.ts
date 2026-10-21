import { JWT } from "google-auth-library";

type Note = { id: string; datetime: string; category: string; content: string; color: number; state: string; order: number };
const headers = ["timestamp", "datetime", "category", "content", "color", "state", "order"];
const categories = ["할 일", "아이디어", "기타"];

async function connection() {
  const { GOOGLE_SHEET_ID: id, GOOGLE_CLIENT_EMAIL: email, GOOGLE_PRIVATE_KEY: privateKey } = process.env;
  if (!id || !email || !privateKey) throw new Error("Google Sheets 환경변수를 설정해 주세요: GOOGLE_SHEET_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY");
  const auth = new JWT({ email, key: privateKey.replace(/\\n/g, "\n"), scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  const { access_token } = await auth.authorize();
  async function request(path: string, method = "GET", body?: unknown) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id!)}${path}`, { method, headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
    if (!response.ok) throw new Error("Google Sheets에 접근하지 못했어요. API 활성화, 시트 ID와 서비스 계정의 편집 권한을 확인해 주세요.");
    return response.json();
  }
  const meta = await request("?fields=sheets.properties");
  const properties = meta.sheets?.find((s: { properties: { title: string } }) => s.properties.title === (process.env.GOOGLE_SHEET_TAB || meta.sheets[0]?.properties.title))?.properties;
  if (!properties) throw new Error("연결할 시트 탭을 찾지 못했어요.");
  const range = `'${properties.title.replace(/'/g, "''")}'`;
  const data = await request(`/values/${encodeURIComponent(range + "!A:G")}`);
  const rows: string[][] = data.values || [];
  if (rows.length && headers.some((h, i) => rows[0]?.[i] !== h)) throw new Error("시트 첫 행의 A:G 제목을 timestamp, datetime, category, content, color, state, order로 설정해 주세요.");
  const notes: Note[] = rows.slice(1).filter(r => r[1]).map(r => ({ id: r[1], datetime: r[1], category: r[2] || "기타", content: r[3] || "", color: ((Number(r[4]) || 0) % 4 + 4) % 4, state: r[5] || "", order: Number(r[6]) || 0 })).sort((a, b) => a.order - b.order);
  return { request, rows, notes, range, sheetId: properties.sheetId };
}
function failure(e: unknown) { return Response.json({ error: e instanceof Error ? e.message : "처리 중 오류가 발생했어요." }, { status: 400 }); }
function validContent(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0 && value.length <= 2000; }

export async function GET() {
  try { const { notes } = await connection(); return Response.json({ notes }); } catch (e) { return failure(e); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!validContent(body.content) || !categories.includes(body.category)) throw new Error("메모 내용과 카테고리를 확인해 주세요.");
    const c = await connection();
    const now = new Date().toISOString();
    const note: Note = { id: now, datetime: now, category: body.category, content: body.content.trim(), color: Math.floor(Math.random() * 4), state: "", order: Math.max(-1, ...c.notes.map(n => n.order)) + 1 };
    if (!c.rows.length) await c.request(`/values/${encodeURIComponent(c.range + "!A1:G1")}?valueInputOption=RAW`, "PUT", { values: [headers] });
    await c.request(`/values/${encodeURIComponent(c.range + "!A:G")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, "POST", { values: [[now, now, note.category, note.content, note.color, note.state, note.order]] });
    return Response.json({ notes: [...c.notes, note] });
  } catch (e) { return failure(e); }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!validContent(body.content) || !categories.includes(body.category) || !["", "완료"].includes(body.state)) throw new Error("수정할 메모 내용을 확인해 주세요.");
    const c = await connection();
    const index = c.rows.findIndex((r, i) => i > 0 && r[1] === body.id);
    const original = c.notes.find(n => n.id === body.id);
    if (index < 1 || !original) throw new Error("메모가 이미 삭제되었어요. 다시 불러와 주세요.");
    const note = { ...original, content: body.content.trim(), category: body.category, state: body.state };
    await c.request(`/values/${encodeURIComponent(c.range + `!A${index + 1}:G${index + 1}`)}?valueInputOption=RAW`, "PUT", { values: [[new Date().toISOString(), note.datetime, note.category, note.content, note.color, note.state, note.order]] });
    return Response.json({ notes: c.notes.map(n => n.id === note.id ? note : n) });
  } catch (e) { return failure(e); }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const c = await connection();
    const index = c.rows.findIndex((r, i) => i > 0 && r[1] === id);
    if (index < 1) throw new Error("메모가 이미 삭제되었어요. 다시 불러와 주세요.");
    await c.request(":batchUpdate", "POST", { requests: [{ deleteDimension: { range: { sheetId: c.sheetId, dimension: "ROWS", startIndex: index, endIndex: index + 1 } } }] });
    return Response.json({ notes: c.notes.filter(n => n.id !== id) });
  } catch (e) { return failure(e); }
}

export async function PATCH(request: Request) {
  try {
    const { ids } = await request.json();
    const c = await connection();
    if (!Array.isArray(ids) || ids.length !== c.notes.length || new Set(ids).size !== ids.length || ids.some(id => !c.notes.some(n => n.id === id))) throw new Error("메모 목록이 변경되었어요. 다시 불러온 뒤 이동해 주세요.");
    const notes = (ids as string[]).map((id, order) => ({ ...c.notes.find(n => n.id === id)!, order }));
    if (notes.length) await c.request("/values:batchUpdate", "POST", { valueInputOption: "RAW", data: notes.map(n => ({ range: c.range + `!G${c.rows.findIndex((r, i) => i > 0 && r[1] === n.id) + 1}`, values: [[n.order]] })) });
    return Response.json({ notes });
  } catch (e) { return failure(e); }
}
