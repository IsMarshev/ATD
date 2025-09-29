import type { ReactNode } from "react";

const statusConfig: Record<
  string,
  { label: string; classes: string; dot: string; icon?: ReactNode }
> = {
  completed: {
    label: "Завершено",
    classes: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  "in-progress": {
    label: "В работе",
    classes: "bg-amber-100 text-amber-700 border border-amber-200",
    dot: "bg-amber-400",
  },
  failed: {
    label: "Ошибка",
    classes: "bg-rose-100 text-rose-700 border border-rose-200",
    dot: "bg-rose-500",
  },
  pending: {
    label: "Ожидает",
    classes: "bg-slate-200 text-slate-700 border border-slate-200",
    dot: "bg-slate-400",
  },
  draft: {
    label: "Черновик",
    classes: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  },
  active: {
    label: "Активен",
    classes: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  archived: {
    label: "Архив",
    classes: "bg-slate-300 text-slate-600 border border-slate-300",
    dot: "bg-slate-500",
  },
};

export function StatusPill({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${config.classes}`}
    >
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
