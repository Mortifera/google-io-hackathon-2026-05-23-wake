"use client";

import { useEffect, useRef, useState } from "react";
import { getApiKey, setApiKey } from "../lib/apiKey";
import s from "./studio.module.css";

/**
 * Bring-your-own Gemini key control. Stores the key in sessionStorage (this tab
 * only); the run lib reads it and sends it per-request. Never persisted by us.
 */
export default function KeyInput() {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [has, setHas] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHas(getApiKey().length > 0);
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const save = () => {
    setApiKey(val);
    setHas(val.trim().length > 0);
    setVal("");
    setOpen(false);
  };
  const remove = () => {
    setApiKey("");
    setHas(false);
    setVal("");
  };

  return (
    <div className={s.keyWrap} ref={popRef}>
      <button
        className={s.keyBtn}
        data-has={has}
        onClick={() => setOpen((v) => !v)}
        title="Use your own Gemini API key for live runs"
      >
        <span className={s.keyDot} data-has={has} />
        {has ? "Your key" : "Add API key"}
      </button>
      {open && (
        <div className={s.keyPop}>
          <div className={s.keyLabel}>Gemini API key</div>
          <input
            className={s.keyField}
            type="password"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={has ? "•••• stored — paste to replace" : "AIza…"}
            onKeyDown={(e) => e.key === "Enter" && save()}
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
          <div className={s.keyHint}>
            Stored only in this browser tab, sent with each run, never saved on our
            side.{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
            >
              Get a key →
            </a>
          </div>
          <div className={s.keyActions}>
            {has && (
              <button className={s.keyClear} onClick={remove}>
                Remove
              </button>
            )}
            <button className={s.keySave} onClick={save} disabled={!val.trim()}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
