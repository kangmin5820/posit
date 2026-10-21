"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Grip, Moon, Pencil, Plus, StickyNote, Sun, Trash2, X } from "lucide-react";

type Note = { id: string; datetime: string; category: string; content: string; color: number; state: string; order: number };
const categories = ["할 일", "아이디어", "기타"];
const dateFormat = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit" });

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("할 일");
  const [filter, setFilter] = useState("전체");
  const [dark, setDark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Note | null>(null);
  const drag = useRef<{ id: string; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  async function load() {
    try {
      const response = await fetch("/api/notes", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNotes(data.notes);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "메모를 불러오지 못했어요."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/notes", { cache: "no-store", signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; })
      .then(data => { if (!controller.signal.aborted) setNotes(data.notes); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "메모를 불러오지 못했어요."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (editing) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [editing]);

  async function mutate(method: string, body: unknown) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/notes", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNotes(data.notes);
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했어요. 다시 시도해 주세요."); return false; }
    finally { setBusy(false); }
  }

  async function reorder(id: string, target: string) {
    const reordered = [...notes];
    const from = reordered.findIndex(n => n.id === id);
    const to = reordered.findIndex(n => n.id === target);
    if (from < 0 || to < 0 || from === to || busy) return;
    reordered.splice(to, 0, reordered.splice(from, 1)[0]);
    await mutate("PATCH", { ids: reordered.map(n => n.id) });
  }

  const visible = notes.filter(n => filter === "전체" || n.category === filter);
  return <div className={`workspace ${dark ? "dark" : ""}`}>
    <header className="header"><Link className="brand" href="/" aria-label="포스트잇 홈"><span className="brand-icon"><StickyNote size={23}/></span> little notes<span className="brand-dot">.</span></Link><button className="theme" onClick={() => setDark(!dark)} aria-label={dark ? "라이트 모드" : "다크 모드"}>{dark ? <Sun size={18}/> : <Moon size={18}/>}<span>{dark ? "라이트 모드" : "다크 모드"}</span></button></header>
    <main>
      <section className="intro"><span className="eyebrow">A LITTLE SPACE FOR YOUR MIND</span><h1>머릿속 생각을,<br/><span>여기에 붙여두세요.</span></h1><p>오늘의 할 일부터 문득 떠오른 아이디어까지.<br className="mobile-break"/> 작게 적고, 가볍게 시작해요.</p></section>
      <form className="composer" onSubmit={async e => { e.preventDefault(); if (!content.trim() || busy) return; if (await mutate("POST", { content: content.trim(), category })) setContent(""); }}>
        <label className="sr-only" htmlFor="content">새 메모 내용</label><textarea id="content" placeholder="어떤 생각을 붙여둘까요?" value={content} onChange={e => setContent(e.target.value)} maxLength={2000} required disabled={busy || loading}/>
        <div className="composer-bottom"><label className="category-label">분류<select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><span className="counter">{content.length} / 2000</span><button className="primary" disabled={busy || loading || !content.trim()}><Plus size={18}/>{busy ? "저장 중…" : "메모 붙이기"}</button></div>
      </form>
      {error && <div className="error" role="alert">{error} <button onClick={() => void load()} disabled={busy || loading}>다시 불러오기</button></div>}
      <section className="board" aria-label="메모 보드"><div className="board-toolbar"><div><h2>나의 메모 보드 <span>{notes.length}</span></h2><p>작은 메모가 모여 하루가 정리돼요.</p></div><label className="filter">카테고리 <select value={filter} onChange={e => setFilter(e.target.value)}><option>전체</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label></div>
        {loading ? <div className="empty" role="status">메모를 불러오고 있어요…</div> : visible.length === 0 ? <div className="empty"><StickyNote size={38}/><h3>새로운 생각을 기다리는 중</h3><p>{filter === "전체" ? "첫 번째 메모를 붙여 보세요." : "이 카테고리에는 아직 메모가 없어요."}</p></div> : <div className="notes-grid">{visible.map(note => <article key={note.id} data-note-id={note.id} className={`note color-${note.color} ${note.state === "완료" ? "done" : ""} ${dragging === note.id ? "dragging" : ""}`}>
          <div className="note-top"><span className="badge">{note.category}</span><button className="grip" aria-label="메모 순서 이동: 드래그 또는 좌우 방향키" title="드래그하거나 좌우 방향키로 이동" disabled={busy} onKeyDown={e => { if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return; e.preventDefault(); const i = notes.findIndex(n => n.id === note.id); const target = notes[i + (e.key === "ArrowLeft" ? -1 : 1)]; if (target) void reorder(note.id, target.id); }} onPointerDown={e => { if (busy) return; drag.current = { id: note.id, x: e.clientX, y: e.clientY }; setDragging(note.id); e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (drag.current?.id === note.id) { const card = e.currentTarget.closest("article") as HTMLElement; card.style.transform = `translate(${e.clientX - drag.current.x}px, ${e.clientY - drag.current.y}px) rotate(2deg)`; } }} onPointerUp={e => { if (!drag.current) return; const card = e.currentTarget.closest("article") as HTMLElement; card.style.transform = ""; const target = document.elementsFromPoint(e.clientX, e.clientY).find(el => el instanceof HTMLElement && el.dataset.noteId && el.dataset.noteId !== note.id) as HTMLElement | undefined; drag.current = null; setDragging(null); if (target?.dataset.noteId) void reorder(note.id, target.dataset.noteId); }} onPointerCancel={e => { (e.currentTarget.closest("article") as HTMLElement).style.transform = ""; drag.current = null; setDragging(null); }}><Grip size={17}/></button></div>
          <p className="note-content">{note.content}</p><div className="note-actions"><button className="complete" aria-label={note.state === "완료" ? "완료 취소" : "완료로 표시"} aria-pressed={note.state === "완료"} disabled={busy} onClick={() => void mutate("PUT", { ...note, state: note.state === "완료" ? "" : "완료" })}><span className="checkbox">{note.state === "완료" && <Check size={13}/>}</span>{note.state === "완료" ? "완료했어요" : "완료하기"}</button><button aria-label="메모 편집" disabled={busy} onClick={() => setEditing({ ...note })}><Pencil size={16}/></button><button aria-label="메모 삭제" disabled={busy} onClick={() => void mutate("DELETE", { id: note.id })}><Trash2 size={16}/></button></div><time dateTime={note.datetime}>{Number.isNaN(Date.parse(note.datetime)) ? note.datetime : dateFormat.format(new Date(note.datetime))}</time>
        </article>)}</div>}
        <p className="board-hint"><Grip size={14}/> 메모 오른쪽 위 손잡이를 잡아 순서를 바꿔보세요.</p>
      </section>
    </main>
    <footer><span>작은 기록, 조금 더 가벼운 하루.</span><small>Copyright INU Post-it Todo List by {process.env.NEXT_PUBLIC_AUTHOR_NAME || "이강민"}</small></footer>
    <dialog ref={dialogRef} onCancel={() => { if (!busy) setEditing(null); }} onClose={() => setEditing(null)}><form onSubmit={async e => { e.preventDefault(); if (editing && await mutate("PUT", editing)) setEditing(null); }}><div className="dialog-heading"><h2>메모 편집</h2><button type="button" aria-label="닫기" disabled={busy} onClick={() => setEditing(null)}><X size={20}/></button></div><label>내용<textarea autoFocus value={editing?.content ?? ""} onChange={e => setEditing(editing ? { ...editing, content: e.target.value } : null)} required maxLength={2000}/></label><label>카테고리<select value={editing?.category} onChange={e => setEditing(editing ? { ...editing, category: e.target.value } : null)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>{error && <p role="alert" className="error">{error}</p>}<button className="primary" disabled={busy || !editing?.content.trim()}>{busy ? "저장 중…" : "변경사항 저장"}</button></form></dialog>
  </div>;
}
