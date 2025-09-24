"use client";

import { changeSet, generationHistory } from "@/data/mockData";
import { formatDateTime } from "@/lib/time";

const previousVersion = generationHistory.find((item) => item.id === "TC-4820");

export default function ChangesPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Изменения в кейсе TC-4820</h1>
        <p className="text-sm text-slate-600">
          Последняя генерация: {formatDateTime(previousVersion?.createdAt ?? "2024-02-20T10:10:00Z")}. Ниже перечислены отличия текущей версии от предыдущей.
        </p>
      </header>

      <section className="space-y-4">
        {changeSet.map((change) => (
          <DiffCard key={change.id} {...change} />
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Как работать с изменениями</h2>
        <ul className="mt-2 space-y-2 text-xs text-slate-500">
          <li>• Примените необходимые изменения вручную в редакторе кейса.</li>
          <li>• Отметьте сценарии, требующие обновления датапула, прежде чем экспортировать.</li>
          <li>• Запрос на регенерацию фиксируется как неуспешная выдача и учитывается в SLA.</li>
        </ul>
      </section>
    </div>
  );
}

function DiffCard({
  id,
  requirement,
  previous,
  current,
  status,
  comment,
}: {
  id: string;
  requirement: string;
  previous: string;
  current: string;
  status: "added" | "modified" | "removed";
  comment?: string;
}) {
  const palette =
    status === "added"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "removed"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <article className={`rounded-xl border ${palette} p-4 text-sm`}>
      <header className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
          {id}
        </span>
        <span className="font-semibold text-slate-800">Требование {requirement}</span>
        <StatusBadge status={status} />
      </header>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <DiffColumn label="Было" value={previous || "—"} />
        <DiffColumn label="Стало" value={current} />
      </div>
      {comment ? <p className="mt-3 text-xs text-slate-600">Комментарий: {comment}</p> : null}
    </article>
  );
}

function DiffColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/60 bg-white p-3 text-slate-700">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-sm">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "added" | "modified" | "removed" }) {
  const map = {
    added: {
      label: "Добавлено",
      classes: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    },
    modified: {
      label: "Изменено",
      classes: "bg-amber-100 text-amber-700 border border-amber-200",
    },
    removed: {
      label: "Удалено",
      classes: "bg-rose-100 text-rose-700 border border-rose-200",
    },
  } as const;

  const config = map[status];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${config.classes}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
