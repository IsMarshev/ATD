"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { createExport, fetchTestCase } from "@/lib/api";
import type { ExportChannel, TestCaseDetail } from "@/lib/types";
import { formatDateTime } from "@/lib/time";

const CHANNEL_OPTIONS: ExportChannel[] = ["Adaptavist", "Zephyr", "Excel"];

type ExportOptions = {
  dryRun: boolean;
  includeAttachments: boolean;
  syncComments: boolean;
  sendNotification: boolean;
};

type MappingRow = {
  target: string;
  source: string;
  type: string;
  required: boolean;
  preview: string;
};

export default function ExportPage() {
  const searchParams = useSearchParams();
  const testCaseId = searchParams.get("id");

  const [testCase, setTestCase] = useState<TestCaseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(testCaseId ? null : "Укажите параметр id, чтобы экспортировать тест-кейс");

  const [channel, setChannel] = useState<ExportChannel>("Adaptavist");
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState("");
  const [options, setOptions] = useState<ExportOptions>({
    dryRun: true,
    includeAttachments: true,
    syncComments: false,
    sendNotification: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!testCaseId) {
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchTestCase(testCaseId);
        if (!cancelled) {
          setTestCase(detail);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить тест-кейс");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [testCaseId]);

  function toggleOption(key: keyof ExportOptions) {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const mapping = useMemo<MappingRow[]>(() => deriveMapping(testCase), [testCase]);

  async function handleExport() {
    if (!testCase) {
      return;
    }
    if (channel === "Excel" && !fileName.trim()) {
      setError("Для Excel укажите имя файла");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const record = await createExport(testCase.id, {
        channel,
        includeDatapool: options.includeAttachments,
        notes: notes.trim() || undefined,
        fileName: channel === "Excel" ? fileName.trim() : undefined,
      });
      setTestCase({ ...testCase, exports: [...testCase.exports, record] });
      setSuccessMessage(`Экспорт в ${record.channel} выполнен`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выполнить экспорт");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Загружаем тест-кейс…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!testCase) {
    return null;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Экспорт тест-кейсов</h1>
        <p className="text-sm text-slate-600">
          Проверьте сопоставление полей и выберите дополнительные опции перед выгрузкой в Adaptavist, Zephyr или Excel.
        </p>
        <p className="text-xs text-slate-500">
          Текущий кейс: <span className="font-semibold text-slate-700">{testCase.reference}</span> • Покрытие {testCase.coverage}%
        </p>
        {successMessage ? <p className="text-xs text-emerald-600">{successMessage}</p> : null}
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Сопоставление полей</h2>
            <p className="text-xs text-slate-500">Контрольный список того, как данные будут переданы на сторону интеграции.</p>
          </div>
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
              {mapping.map((row) => (
                <tr key={row.target} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-semibold text-slate-900">{row.target}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{row.source}</td>
                  <td className="px-3 py-2 text-slate-600">{row.type}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs ${row.required ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {row.required ? "Обязательное" : "Необязательное"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{row.preview}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-slate-900">Опции перед экспортом</h2>
          <div className="mt-3 space-y-3">
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              <span>Целевая система</span>
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value as ExportChannel)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500"
              >
                {CHANNEL_OPTIONS.map((item) => (
                  <option key={item} value={item} className="bg-white text-slate-700">
                    {item}
                  </option>
                ))}
              </select>
            </label>
            {channel === "Excel" ? (
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                <span>Имя файла</span>
                <input
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  placeholder={`${testCase.reference.toLowerCase()}-export.xlsx`}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-500"
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              <span>Комментарий</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Добавьте заметку для журнала экспорта"
                className="min-h-[80px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-500"
              />
            </label>
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
            {testCase.exports.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{entry.channel}</span>
                  <span>{formatDateTime(entry.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{entry.details || "Экспорт выполнен"}</p>
              </li>
            ))}
            {testCase.exports.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                История экспортов пока пустая.
              </li>
            ) : null}
          </ul>
        </aside>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => setSuccessMessage("Пробный прогон выполнен (симуляция)")}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Запустить пробный прогон
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={submitting}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Экспортируем…" : "Экспортировать сейчас"}
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

function deriveMapping(testCase: TestCaseDetail | null): MappingRow[] {
  if (!testCase) {
    return [];
  }

  const datapoolName = typeof testCase.metadata?.datapool === "string" ? testCase.metadata.datapool : "—";
  const tagsPreview = testCase.tags.length ? testCase.tags.join(", ") : "—";

  return [
    {
      target: "Резюме",
      source: "testCase.title",
      type: "Текст",
      required: true,
      preview: testCase.title,
    },
    {
      target: "Шаги",
      source: "steps[*]",
      type: "Массив шагов",
      required: true,
      preview: `${testCase.steps.length} шагов сопоставлено`,
    },
    {
      target: "Датапул",
      source: "metadata.datapool",
      type: "Вложение",
      required: false,
      preview: datapoolName,
    },
    {
      target: "Теги",
      source: "testCase.tags",
      type: "Множественный выбор",
      required: false,
      preview: tagsPreview,
    },
  ];
}
