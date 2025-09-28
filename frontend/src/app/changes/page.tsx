"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { fetchTestCase } from "@/lib/api";
import type { TestCaseDetail, TestCaseStep } from "@/lib/types";
import { formatDateTime } from "@/lib/time";

export default function ChangesPage() {
  const searchParams = useSearchParams();
  const testCaseId = searchParams.get("id");

  const [testCase, setTestCase] = useState<TestCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(testCaseId ? null : "Укажите параметр id, чтобы сравнить изменения");

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

  const flaggedSteps = useMemo(() => selectFlaggedSteps(testCase), [testCase]);
  const riskyRequirements = useMemo(
    () =>
      testCase?.requirementCoverage
        .filter((item) => item.coverage < 80)
        .map((item) => ({ id: item.id, title: item.title, coverage: item.coverage })) ?? [],
    [testCase],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Загружаем изменения…
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
        <h1 className="text-3xl font-semibold text-slate-900">Изменения в кейсе {testCase.reference}</h1>
        <p className="text-sm text-slate-600">
          Последняя генерация: {formatDateTime(testCase.generatedAt)}. Ниже перечислены шаги, требующие внимания и параметры покрытия.
        </p>
      </header>

      <section className="space-y-4">
        {flaggedSteps.length === 0 ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            Все шаги находятся в статусе "готов" — несогласованные изменения не обнаружены.
          </p>
        ) : (
          flaggedSteps.map((item) => <DiffCard key={item.step.id} {...item} />)
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Как работать с изменениями</h2>
        <ul className="mt-2 space-y-2 text-xs text-slate-500">
          <li>• Примените необходимые изменения в редакторе кейса и обновите статус шага.</li>
          <li>• Перегенерируйте сценарий, если покрытие упало ниже целевого значения.</li>
          <li>• После правок выполните экспорт и убедитесь, что все проверки проходят.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Требования с низким покрытием</h2>
        {riskyRequirements.length === 0 ? (
          <p className="text-xs text-slate-500">Все требования соответствуют целевому уровню покрытия.</p>
        ) : (
          <ul className="space-y-2">
            {riskyRequirements.map((item) => (
              <li key={item.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-800">{item.id}</span>
                  <span>{item.coverage}%</span>
                </div>
                <p className="mt-1 text-[13px] text-amber-800">{item.title}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type FlaggedStep = {
  step: TestCaseStep;
  status: "edited" | "pending" | "rule";
};

function selectFlaggedSteps(testCase: TestCaseDetail | null): FlaggedStep[] {
  if (!testCase) {
    return [];
  }
  return testCase.steps
    .filter((step) => step.status !== "ready" || step.ruleHits.length > 0)
    .map((step) => ({
      step,
      status: step.status !== "ready" ? step.status : "rule",
    }));
}

function DiffCard({ step, status }: FlaggedStep) {
  const palette =
    status === "edited"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : status === "pending"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  const statusLabel =
    status === "edited"
      ? "Изменён вручную"
      : status === "pending"
        ? "Требует проверки"
        : "Есть дополнительные проверки";

  return (
    <article className={`rounded-xl border ${palette} p-4 text-sm`}>
      <header className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
          Шаг {step.position}
        </span>
        <span className="font-semibold text-slate-800">{statusLabel}</span>
      </header>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <DiffColumn label="Действие" value={step.action} />
        <DiffColumn label="Ожидание" value={step.expected} />
      </div>
      {step.ruleHits.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-rose-600">
          {step.ruleHits.map((rule) => (
            <li key={rule} className="rounded-lg border border-rose-200 bg-white p-2">{rule}</li>
          ))}
        </ul>
      ) : null}
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
