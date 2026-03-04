"use client";

import { useMemo, useState } from "react";
import type { ObjectionLibrary, ObjectionRow } from "@/lib/trainer-objections";
import styles from "./page.module.css";

type Difficulty = "D1" | "D2" | "D3" | "D4" | "D5";

type ObjectionsEditorProps = {
  initialLibrary: ObjectionLibrary;
  initialGuides: Record<string, string>;
};

type SaveResponse = {
  ok?: boolean;
  error?: string;
  updatedAt?: number;
};

export default function ObjectionsEditor({ initialLibrary, initialGuides }: ObjectionsEditorProps) {
  const [library, setLibrary] = useState<ObjectionLibrary>(initialLibrary);
  const [guides, setGuides] = useState<Record<string, string>>(initialGuides);
  const [savedLibrary, setSavedLibrary] = useState<ObjectionLibrary>(initialLibrary);
  const [savedGuides, setSavedGuides] = useState<Record<string, string>>(initialGuides);
  const [status, setStatus] = useState("Edits save for your entire team.");
  const [saving, setSaving] = useState(false);

  const rebuttalOptions = useMemo(() => Object.keys(guides).sort(), [guides]);

  async function handleSave() {
    setSaving(true);
    setStatus("Saving changes...");

    try {
      const response = await fetch("/api/trainer/objections", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          objectionLibrary: library,
          rebuttalGuides: guides,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as SaveResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to save objection library.");
      }

      const updatedAt = payload.updatedAt ? new Date(payload.updatedAt).toLocaleString() : "just now";
      setSavedLibrary(library);
      setSavedGuides(guides);
      setStatus(`Saved. Updated ${updatedAt}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save objection library.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setLibrary(savedLibrary);
    setGuides(savedGuides);
    setStatus("Reset to last saved organization settings.");
  }

  function updateObjection(difficulty: Difficulty, index: number, key: keyof ObjectionRow, value: string) {
    setLibrary((previous) => {
      const next = { ...previous };
      const rows = [...next[difficulty]];
      rows[index] = {
        ...rows[index],
        [key]: value,
      };
      next[difficulty] = rows;
      return next;
    });
  }

  function addObjection(difficulty: Difficulty) {
    setLibrary((previous) => ({
      ...previous,
      [difficulty]: [...previous[difficulty], { text: "", rebuttalType: "not_interested", frequency: "Common" }],
    }));
  }

  function removeObjection(difficulty: Difficulty, index: number) {
    setLibrary((previous) => {
      const rows = previous[difficulty].filter((_, rowIndex) => rowIndex !== index);
      return {
        ...previous,
        [difficulty]: rows.length > 0 ? rows : [{ text: "", rebuttalType: "not_interested", frequency: "Common" }],
      };
    });
  }

  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.sectionTag}>Objection Library</p>
            <h2>Edit objections and rebuttal mappings</h2>
            <p className={styles.helpText}>Changes apply across your organization sessions.</p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={handleReset} disabled={saving}>
              Reset
            </button>
            <button type="button" className={styles.primaryButton} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save edits"}
            </button>
          </div>
        </div>
        <p className={styles.status}>{status}</p>
      </section>

      <section className={styles.panel}>
        <div className={styles.headerRowCompact}>
          <h3>Rebuttal strategies</h3>
        </div>
        <div className={styles.guidesGrid}>
          {Object.entries(guides).map(([key, value]) => (
            <label className={styles.guideCard} key={key}>
              <span>{key}</span>
              <textarea
                value={value}
                onChange={(event) =>
                  setGuides((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }))
                }
                rows={3}
              />
            </label>
          ))}
        </div>
      </section>

      {(Object.entries(library) as Array<[Difficulty, ObjectionRow[]]>).map(([difficulty, objections]) => (
        <section className={styles.panel} key={difficulty}>
          <div className={styles.headerRowCompact}>
            <h3>{difficulty} objection set</h3>
            <button type="button" className={styles.secondaryButton} onClick={() => addObjection(difficulty)}>
              Add objection
            </button>
          </div>

          <div className={styles.objectionList}>
            {objections.map((objection, index) => (
              <article className={styles.objectionCard} key={`${difficulty}-${index}`}>
                <label className={styles.field}>
                  <span>Objection text</span>
                  <textarea
                    rows={3}
                    value={objection.text}
                    onChange={(event) => updateObjection(difficulty, index, "text", event.target.value)}
                  />
                </label>
                <div className={styles.rowFields}>
                  <label className={styles.field}>
                    <span>Expected rebuttal</span>
                    <select
                      value={objection.rebuttalType}
                      onChange={(event) => updateObjection(difficulty, index, "rebuttalType", event.target.value)}
                    >
                      {rebuttalOptions.map((option) => (
                        <option value={option} key={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Frequency</span>
                    <select
                      value={objection.frequency}
                      onChange={(event) => updateObjection(difficulty, index, "frequency", event.target.value)}
                    >
                      <option value="Very common">Very common</option>
                      <option value="Common">Common</option>
                      <option value="Occasional">Occasional</option>
                      <option value="Hard stop">Hard stop</option>
                    </select>
                  </label>
                </div>
                <button type="button" className={styles.removeButton} onClick={() => removeObjection(difficulty, index)}>
                  Remove
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
