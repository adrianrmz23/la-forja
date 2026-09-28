import { useEffect, useMemo, useState } from "react";
import { Dumbbell, ImageOff, LoaderCircle, X } from "lucide-react";
import type { OperationExercise } from "../types/operationForja.ts";
import "./RepDbExerciseGuide.css";

interface RepDbRow {
  id: string;
  name_es?: string;
  name_en?: string;
  instructions_en?: string;
  description_en?: string;
  equipment?: string | null;
  primary_muscles?: string;
  secondary_muscles?: string | null;
  image_flat_start?: string | null;
  image_flat_peak?: string | null;
  image_flat_main?: string | null;
}

const ASSET_BASE = "https://huggingface.co/datasets/RepDB/exercise-dataset/resolve/main/";

function asset(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${ASSET_BASE}${path}`;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBest(exercise: OperationExercise, rows: RepDbRow[]) {
  for (const id of exercise.repdbIds ?? []) {
    const exact = rows.find((row) => row.id === id);
    if (exact) return exact;
  }

  const query = normalize(exercise.name);
  return rows.find((row) => {
    const haystack = normalize(`${row.name_es ?? ""} ${row.name_en ?? ""}`);
    return haystack.includes(query) || query.includes(haystack);
  });
}

export function RepDbExerciseGuide({
  exercise,
  onClose,
}: {
  exercise: OperationExercise | null;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<RepDbRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!exercise) return;
    let cancelled = false;

    void fetch("/api/repdb?limit=601")
      .then(async (response) => {
        if (!response.ok) throw new Error("RepDB no disponible");
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const nextRows = (payload.rows ?? [])
          .map((item: { row?: RepDbRow } | RepDbRow) =>
            "row" in item && item.row ? item.row : item,
          )
          .filter((item: RepDbRow) => Boolean(item?.id));
        setRows(nextRows);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [exercise]);

  const record = useMemo(
    () => (exercise ? findBest(exercise, rows) : undefined),
    [exercise, rows],
  );

  if (!exercise) return null;

  const frames = record
    ? [
        { label: "Inicio", url: asset(record.image_flat_start) },
        { label: "Pico", url: asset(record.image_flat_peak) },
        { label: "Referencia", url: asset(record.image_flat_main) },
      ].filter((frame): frame is { label: string; url: string } => Boolean(frame.url))
    : [];

  return (
    <div className="operation-repdb-dialog" role="dialog" aria-modal="true">
      <button className="operation-repdb-dialog__backdrop" onClick={onClose} type="button" aria-label="Cerrar" />
      <section className="operation-repdb-dialog__sheet">
        <header>
          <div>
            <span>GUÍA VISUAL · REPDB</span>
            <h2>{record?.name_es || exercise.name}</h2>
          </div>
          <button onClick={onClose} type="button" aria-label="Cerrar guía"><X size={20} /></button>
        </header>

        {status === "loading" && (
          <div className="operation-repdb-state"><LoaderCircle className="operation-spin" /> Cargando referencia…</div>
        )}

        {status === "ready" && record && (
          <>
            {frames.length > 0 ? (
              <div className={`operation-repdb-frames ${frames.length === 1 ? "operation-repdb-frames--single" : ""}`}>
                {frames.map((frame) => (
                  <figure key={frame.label}>
                    <img src={frame.url} alt={`${exercise.name} · ${frame.label}`} />
                    <figcaption>{frame.label}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="operation-repdb-state"><ImageOff /> RepDB no tiene ilustración para esta variante.</div>
            )}

            <div className="operation-repdb-meta">
              <span><Dumbbell size={15} /> {record.equipment || exercise.equipment}</span>
              {record.primary_muscles && <span>{record.primary_muscles.replaceAll("|", " · ")}</span>}
            </div>

            <div className="operation-repdb-copy">
              <h3>Cómo hacerlo</h3>
              <p>{record.instructions_en || record.description_en || exercise.instructions || "Realiza el movimiento con control y dentro de un rango cómodo."}</p>
            </div>
          </>
        )}

        {(status === "error" || (status === "ready" && !record)) && (
          <div className="operation-repdb-state operation-repdb-state--warning">
            <ImageOff />
            No encontré una referencia exacta en RepDB para este ejercicio. El entrenamiento sigue disponible; solo falta la guía visual.
          </div>
        )}

        <footer>
          Exercise data by RepDB (repdb.co). Las imágenes se muestran como referencia técnica, no como detector de cámara.
        </footer>
      </section>
    </div>
  );
}
