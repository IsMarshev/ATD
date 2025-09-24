"use client";

import { useMemo, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import { integrations, type IntegrationProfile } from "@/data/mockData";
import { formatDateTime } from "@/lib/time";

export default function IntegrationsPage() {
  const [selectedIntegrationId, setSelectedIntegrationId] = useState(integrations[0]?.id);
  const selectedIntegration = useMemo(
    () => integrations.find((integration) => integration.id === selectedIntegrationId),
    [selectedIntegrationId],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-900">Интеграции</h1>
          <StatusPill status="completed" />
        </div>
        <p className="text-sm text-slate-600">
          Управляйте подключениями к Adaptavist, Zephyr и Excel. Выберите интеграцию, чтобы посмотреть параметры.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Подключённые рабочие области</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                profile={integration}
                active={integration.id === selectedIntegrationId}
                onSelect={() => setSelectedIntegrationId(integration.id)}
              />
            ))}
          </div>
        </div>
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-slate-900">Детали подключения</h2>
          {selectedIntegration ? (
            <div className="mt-3 space-y-3">
              <DetailItem label="Название" value={selectedIntegration.name} />
              <DetailItem label="URL" value={selectedIntegration.url} />
              <DetailItem label="Проект" value={selectedIntegration.project} />
              <DetailItem label="Тип авторизации" value={selectedIntegration.authType} />
              <DetailItem label="Последняя синхронизация" value={formatDateTime(selectedIntegration.lastSync)} />
              <StatusBadge status={selectedIntegration.status} />
              <p className="text-xs text-slate-500">
                Завершённые кейсы отправляются автоматически. Регенерации остаются внутри системы до повторной проверки.
              </p>
              <div className="flex gap-2">
                <button className="flex-1 rounded-full bg-slate-900 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  Проверить соединение
                </button>
                <button className="flex-1 rounded-full border border-slate-300 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  Переавторизовать
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Выберите интеграцию, чтобы увидеть конфигурацию.</p>
          )}
        </aside>
      </section>
    </div>
  );
}

function IntegrationCard({
  profile,
  active,
  onSelect,
}: {
  profile: IntegrationProfile;
  active: boolean;
  onSelect: () => void;
}) {
  const palette =
    profile.status === "connected"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : profile.status === "pending"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-rose-200 bg-rose-50 text-rose-700";
  const statusLabel =
    profile.status === "connected"
      ? "подключено"
      : profile.status === "pending"
        ? "ожидает"
        : "ошибка";

  return (
    <button
      onClick={onSelect}
      className={`flex flex-col gap-2 rounded-xl border px-3 py-3 text-left text-sm transition ${
        active ? "ring-2 ring-slate-400" : "hover:border-slate-400"
      }`}
    >
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold text-slate-900">{profile.name}</span>
        <span className={`rounded-full px-3 py-1 capitalize ${palette}`}>{statusLabel}</span>
      </div>
      <p className="text-xs text-slate-500">{profile.description}</p>
      <p className="text-[11px] text-slate-500">Последняя синхронизация {formatDateTime(profile.lastSync)}</p>
    </button>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
      <p className="uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: IntegrationProfile["status"] }) {
  const mapping = {
    connected: {
      label: "Подключено",
      classes: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    },
    pending: {
      label: "Ожидает",
      classes: "bg-amber-100 text-amber-700 border border-amber-200",
    },
    error: {
      label: "Ошибка",
      classes: "bg-rose-100 text-rose-700 border border-rose-200",
    },
  } as const;

  const config = mapping[status];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${config.classes}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
