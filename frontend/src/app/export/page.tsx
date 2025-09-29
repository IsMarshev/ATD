"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { buildExportUrl, fetchTestCase } from "@/lib/api";
import type { TestCase } from "@/lib/types";
import { formatDateTime } from "@/lib/time";

const FORMATS = [
  { value: "excel", label: "Excel (.xlsx)" },
  { value: "csv", label: "CSV" },
  { value: "adaptavist", label: "Adaptavist CSV" },
  { value: "zephyr", label: "Zephyr CSV" },
] as const;

export default function ExportPage() {
  const searchParams = useSearchParams();
  const testCaseId = searchParams.get("id");

  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(testCaseId ? null : "Укажите параметр id, чтобы экспортировать тест-кейс");
  const [format, setFormat] = useState<(typeof FORMATS)[number]["value"]>("excel");

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

  function handleDownload() {
    if (!testCase) {
      return;
    }
    const url = buildExportUrl(testCase.id, format);
    window.open(url, "_blank", "noopener,noreferrer");
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
        <h1 className="text-3xl font-semibold text-slate-900">Экспорт тест-кейса</h1>
        <p className="text-sm text-slate-600">
          Скачайте сценарий {testCase.number} в нужном формате. Файлы готовы для импорта в QA-инструменты.
        </p>
        <p className="text-xs text-slate-500">Создан {formatDateTime(testCase.createdAt)} • Шагов {testCase.steps.length}</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-slate-900">Содержимое</h2>
          <p className="mt-2 text-xs text-slate-500">
            В файл попадут все шаги, пред- и постусловия, а также номер и автор сценария.
          </p>
          <div className="mt-4 space-y-3">
            <DetailRow label="Название" value={testCase.title} />
            <DetailRow label="Автор" value={testCase.author ?? "—"} />
            <DetailRow label="Последняя редакция" value={formatDateTime(testCase.updatedAt ?? testCase.createdAt)} />
            {testCase.latestGenerationSummary ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Краткое описание генерации</p>
                <p className="mt-2 text-slate-700">{testCase.latestGenerationSummary}</p>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-slate-900">Настройки выгрузки</h2>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            <span>Формат файла</span>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as (typeof FORMATS)[number]["value"])}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500"
            >
              {FORMATS.map((item) => (
                <option key={item.value} value={item.value} className="bg-white text-slate-700">
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-slate-500">
            Для CSV форматов используется кодировка UTF-8 с BOM. Excel содержит шаги на отдельной вкладке.
          </p>
          <button
            type="button"
            onClick={handleDownload}
            className="w-full rounded-full bg-slate-900 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Скачать
          </button>
        </aside>
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
      <p className="uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm text-slate-900">{value}</p>
    </div>
  );
}
