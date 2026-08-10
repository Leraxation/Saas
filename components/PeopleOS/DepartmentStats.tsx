"use client";

import { useEffect, useRef, useState } from "react";
import type { Department } from "@/lib/departments";
import type { DepartmentData } from "@/lib/hrData";

export function DepartmentStats({ department }: { department: Department }) {
  const [data, setData] = useState<DepartmentData | null>(null);
  const [editable, setEditable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filled, setFilled] = useState(0);
  const [open, setOpen] = useState(0);
  const [itemsText, setItemsText] = useState("");
  const [note, setNote] = useState("");

  const activeDeptRef = useRef(department.id);

  useEffect(() => {
    activeDeptRef.current = department.id;
    setEditing(false);
    setError(null);
    setLoading(true);
    fetch(`/api/people-os/departments/${department.id}`)
      .then((res) => res.json())
      .then((body: { data: DepartmentData | null; editable: boolean }) => {
        if (activeDeptRef.current !== department.id) return;
        setData(body.data);
        setEditable(body.editable);
        if (body.data) {
          setFilled(body.data.headcountFilled);
          setOpen(body.data.headcountOpen);
          setItemsText(body.data.openItems.join("\n"));
          setNote(body.data.note);
        }
      })
      .catch(() => {
        if (activeDeptRef.current === department.id) setError("Couldn't load live data.");
      })
      .finally(() => {
        if (activeDeptRef.current === department.id) setLoading(false);
      });
  }, [department.id]);

  async function save() {
    setSaving(true);
    setError(null);
    const requestDeptId = department.id;
    try {
      const res = await fetch(`/api/people-os/departments/${requestDeptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headcountFilled: filled,
          headcountOpen: open,
          openItems: itemsText.split("\n").map((s) => s.trim()).filter(Boolean),
          note,
        }),
      });
      const body = await res.json();
      if (activeDeptRef.current !== requestDeptId) return;
      if (!res.ok) {
        setError(body.error ?? "Save failed.");
        return;
      }
      setData(body.data);
      setEditing(false);
    } catch {
      if (activeDeptRef.current === requestDeptId) setError("Network error — try again.");
    } finally {
      if (activeDeptRef.current === requestDeptId) setSaving(false);
    }
  }

  if (loading) {
    return <div className="px-5 py-3 border-b border-slate-800 flex-shrink-0 h-[52px] animate-pulse bg-slate-800/30" />;
  }
  if (!data) return null;

  if (editing) {
    return (
      <div className="px-5 py-3 border-b border-slate-800 flex-shrink-0 space-y-2">
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-slate-400">
            Filled
            <input
              type="number"
              min={0}
              value={filled}
              onChange={(e) => setFilled(Number(e.target.value))}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
            />
          </label>
          <label className="flex-1 text-xs text-slate-400">
            Open roles
            <input
              type="number"
              min={0}
              value={open}
              onChange={(e) => setOpen(Number(e.target.value))}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
            />
          </label>
        </div>
        <label className="block text-xs text-slate-400">
          Open items (one per line)
          <textarea
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
            rows={3}
            className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white resize-none"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Note
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
          />
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-full text-white disabled:opacity-50"
            style={{ backgroundColor: department.accent }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-xs px-3 py-1.5 rounded-full text-slate-300 border border-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-3 border-b border-slate-800 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-300">
            <span className="font-semibold text-white">{data.headcountFilled}</span> filled
          </span>
          <span className="text-slate-300">
            <span className="font-semibold text-white">{data.headcountOpen}</span> open role
            {data.headcountOpen === 1 ? "" : "s"}
          </span>
        </div>
        {editable && (
          <button onClick={() => setEditing(true)} className="text-xs text-slate-400 hover:text-white transition-colors">
            Edit
          </button>
        )}
      </div>
      {data.openItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {data.openItems.map((item) => (
            <span key={item} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {item}
            </span>
          ))}
        </div>
      )}
      {data.note && <p className="text-xs text-slate-500 mt-2 italic">{data.note}</p>}
      {!editable && (
        <p className="text-[10px] text-slate-600 mt-2">
          Read-only demo data — set UPSTASH_REDIS_REST_URL/TOKEN to make this editable.
        </p>
      )}
    </div>
  );
}
