"use client";

import { useState } from "react";
import { exportLog, exportMappings } from "@/data/mockData";
import { formatDateTime } from "@/lib/time";

type ExportOptions = {
  dryRun: boolean;
  includeAttachments: boolean;
  syncComments: boolean;
  sendNotification: boolean;
};

export default function ExportPage() {
  const [options, setOptions] = useState<ExportOptions>({
    dryRun: true,
    includeAttachments: true,
    syncComments: false,
    sendNotification: true,
  });

  function toggleOption(key: keyof ExportOptions) {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Экспорт тест-кейсов</h1>
        <p className="text-sm text-slate-600">
          Проверьте сопоставление полей и выберите дополнительные опции перед выгрузкой в Adaptavist, Zephyr или Excel.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Сопоставление полей</h2>
            <p className="text-xs text-slate-500">Контрольный список того, как данные будут переданы на сторону интеграции.</p>
          </div>
          <button className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
            Править шаблон
          </button>
        </header>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Целевое поле</th>
                <th className="px-3 py-2">Источник</th>
                <th className="px-3 py-2">Тип</th>
                <th className="px-3 py-2">Обязательное</th>
                <th className="px-3 py-2">Превью</th>
              </tr>
            </thead>
            <tbody>
              {exportMappings.map((mapping) => (
                <tr key={mapping.target} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-semibold text-slate-900">{mapping.target}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{mapping.source}</td>
                  <td className="px-3 py-2 text-slate-600">{mapping.type}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs ${mapping.required ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {mapping.required ? "Обязательное" : "Необязательное"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{mapping.preview}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-slate-900">Опции перед экспортом</h2>
          <div className="mt-3 space-y-2">
            <ToggleRow
              label="Пробный прогон"
              description="Проверить обязательные поля без фактической отправки."
              checked={options.dryRun}
              onToggle={() => toggleOption("dryRun")}
            />
            <ToggleRow
              label="Вложить датапул"
              description="Добавить исходные файлы в результирующую задачу."
              checked={options.includeAttachments}
              onToggle={() => toggleOption("includeAttachments")}
            />
            <ToggleRow
              label="Синхронизировать комментарии"
              description="Передать обсуждения в задачи интеграции."
              checked={options.syncComments}
              onToggle={() => toggleOption("syncComments")}
            />
            <ToggleRow
              label="Уведомить канал проекта"
              description="Отправить краткую сводку в Slack."
              checked={options.sendNotification}
              onToggle={() => toggleOption("sendNotification")}
            />
          </div>
        </div>
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-slate-900">Журнал последних действий</h2>
          <ul className="mt-3 space-y-3">
            {exportLog.map((entry) => (
              <li key={entry.timestamp} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{entry.channel}</span>
                  <span>{formatDateTime(entry.timestamp)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{entry.details}</p>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          Запустить пробный прогон
        </button>
        <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Экспортировать сейчас
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 h-4 w-4 rounded border border-slate-300"
      />
      <div>
        <p className="font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </label>
  );
}
