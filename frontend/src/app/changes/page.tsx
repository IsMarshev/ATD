"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { fetchTestCase } from "@/lib/api";
import type { TestCase, TestCaseRevision, TestCaseStep } from "@/lib/types";
import { formatDateTime } from "@/lib/time";

export default function ChangesPage() {
  const searchParams = useSearchParams();
  const testCaseId = searchParams.get("id");

  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(testCaseId ? null : "Укажите параметр id, чтобы посмотреть изменения");

  useEffect(() => {
    if (!testCaseId) {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Загружаем историю…
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
        <h1 className="text-3xl font-semibold text-slate-900">Изменения в кейсе {testCase.number}</h1>
        <p className="text-sm text-slate-600">
          Ниже показаны ключевые шаги и история версий. Используйте страницу редактора для внесения правок.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Текущие шаги</h2>
            {testCase.steps.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Шаги отсутствуют.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {testCase.steps.map((step) => (
                  <StepCard key={step.id} step={step} />
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-slate-900">История версий</h2>
          {testCase.revisions.length === 0 ? (
            <p className="text-xs text-slate-500">Ревизии ещё не создавались.</p>
          ) : (
            <ul className="space-y-3">
              {testCase.revisions.map((revision) => (
                <RevisionCard key={revision.id} revision={revision} />
              ))}
            </ul>
          )}
        </aside>
      </section>
    </div>
  );
}

function StepCard({ step }: { step: TestCaseStep }) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold text-slate-600">Шаг {step.orderIndex}</span>
        <span>{formatDateTime(step.updatedAt ?? step.createdAt)}</span>
      </div>
      <div className="mt-2">
        <p className="font-semibold text-slate-900">Действие</p>
        <p className="mt-1 text-sm text-slate-700">{step.action}</p>
      </div>
      {step.expectedResult ? (
        <div className="mt-3">
          <p className="font-semibold text-slate-900">Ожидаемый результат</p>
          <p className="mt-1 text-sm text-slate-700">{step.expectedResult}</p>
        </div>
      ) : null}
      {step.notes ? (
        <div className="mt-3">
          <p className="font-semibold text-slate-900">Примечания</p>
          <p className="mt-1 text-sm text-slate-700">{step.notes}</p>
        </div>
      ) : null}
    </li>
  );
}

function RevisionCard({ revision }: { revision: TestCaseRevision }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
        <span>Версия {revision.version}</span>
        <span>{formatDateTime(revision.createdAt)}</span>
      </div>
      {revision.summary ? (
        <p className="mt-2 text-sm text-slate-800">{revision.summary}</p>
      ) : null}
      {Object.keys(revision.changes ?? {}).length > 0 ? (
        <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-600">
          {JSON.stringify(revision.changes, null, 2)}
        </pre>
      ) : null}
    </li>
  );
}
