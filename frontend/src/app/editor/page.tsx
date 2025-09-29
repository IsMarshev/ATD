"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { StatusPill } from "@/components/status-pill";
import { fetchTestCase, regenerateTestCase, updateTestCaseStep } from "@/lib/api";
import type { ContextBundle, TestCase, TestCaseStep } from "@/lib/types";
import { formatDateTime } from "@/lib/time";

export default function CaseEditorPage() {
  const searchParams = useSearchParams();
  const testCaseId = searchParams.get("id");

  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [steps, setSteps] = useState<TestCaseStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string>("");
  const [draftMessage, setDraftMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const originalSteps = useRef<Map<string, TestCaseStep>>(new Map());

  useEffect(() => {
    if (!testCaseId) {
      setError("Укажите параметр id, чтобы открыть тест-кейс");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchTestCase(testCaseId);
        if (cancelled) {
          return;
        }
        setTestCase(detail);
        setSteps(detail.steps);
        setSelectedStepId(detail.steps[0]?.id ?? "");
        originalSteps.current = new Map(detail.steps.map((step) => [step.id, step]));
        setNotification(null);
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

  function updateStep(
    id: string,
    field: keyof Pick<TestCaseStep, "action" | "expectedResult" | "notes">,
    value: string,
  ) {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id
          ? {
              ...step,
              [field]: value,
            }
          : step,
      ),
    );
  }

  function changedSteps(): TestCaseStep[] {
    const updates: TestCaseStep[] = [];
    steps.forEach((step) => {
      const original = originalSteps.current.get(step.id);
      if (!original) {
        updates.push(step);
        return;
      }
      if (
        original.action !== step.action ||
        (original.expectedResult ?? "") !== (step.expectedResult ?? "") ||
        (original.notes ?? "") !== (step.notes ?? "") ||
        original.orderIndex !== step.orderIndex
      ) {
        updates.push(step);
      }
    });
    return updates;
  }

  async function reloadTestCase() {
    if (!testCaseId) {
      return;
    }
    const detail = await fetchTestCase(testCaseId);
    setTestCase(detail);
    setSteps(detail.steps);
    originalSteps.current = new Map(detail.steps.map((step) => [step.id, step]));
    setSelectedStepId((prev) => (detail.steps.some((step) => step.id === prev) ? prev : detail.steps[0]?.id ?? ""));
  }

  async function handleSave() {
    if (!testCase) {
      return;
    }
    const modified = changedSteps();
    if (modified.length === 0) {
      setNotification("Изменений нет — всё уже сохранено");
      return;
    }

    setSaving(true);
    setNotification(null);
    setError(null);
    try {
      await Promise.all(
        modified.map((step) =>
          updateTestCaseStep(testCase.id, step.id, {
            action: step.action,
            expectedResult: step.expectedResult,
            notes: step.notes,
            orderIndex: step.orderIndex,
          }),
        ),
      );
      await reloadTestCase();
      setNotification("Шаги обновлены");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить изменения");
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    if (!testCase) {
      return;
    }
    setSaving(true);
    setNotification(null);
    setError(null);
    try {
      const context = toContextBundle(testCase, draftMessage);
      const updated = await regenerateTestCase(testCase.id, {
        context,
        documents: [],
        existingSteps: steps,
      });
      setTestCase(updated);
      setSteps(updated.steps);
      originalSteps.current = new Map(updated.steps.map((step) => [step.id, step]));
      setDraftMessage("");
      setNotification("Перегенерация завершена");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось выполнить перегенерацию");
    } finally {
      setSaving(false);
    }
  }

  const selectedStep = useMemo(
    () => steps.find((step) => step.id === selectedStepId) ?? null,
    [steps, selectedStepId],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Загружаем данные тест-кейса…
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
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-900">{testCase.title}</h1>
          <StatusPill status={testCase.status} />
        </div>
        <p className="text-sm text-slate-600">
          Номер {testCase.number} • Версия {testCase.version} • Создан {formatDateTime(testCase.createdAt)}.
        </p>
        {notification ? <p className="text-xs text-emerald-600">{notification}</p> : null}
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Шаги сценария</h2>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Сохраняем…" : "Сохранить"}
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={saving}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Работаем…" : "Перегенерировать"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <aside className="space-y-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {steps.length === 0 ? (
                <p className="text-xs text-slate-500">Шаги отсутствуют.</p>
              ) : (
                <ul className="space-y-2">
                  {steps.map((step) => (
                    <li key={step.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedStepId(step.id)}
                        className={`flex w-full flex-col gap-1 rounded-xl border px-3 py-2 text-left transition ${
                          step.id === selectedStepId ? "border-slate-400 bg-white" : "border-transparent hover:border-slate-300"
                        }`}
                      >
                        <span className="text-xs font-semibold text-slate-500">Шаг {step.orderIndex}</span>
                        <span className="line-clamp-2 text-sm text-slate-700">{step.action}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            <div className="space-y-4">
              {selectedStep ? (
                <StepEditor step={selectedStep} onChange={updateStep} />
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Выберите шаг, чтобы отредактировать.
                </p>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Контекст</h2>
            <p className="text-xs text-slate-500">Освежите вводные данные перед перегенерацией.</p>
          </div>
          <ContextPreview context={testCase.requirementContext} />
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            <span>Комментарий для модели</span>
            <textarea
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              rows={5}
              placeholder="Что поменялось и что нужно учесть"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500"
            />
          </label>
          <div className="flex gap-2 text-xs">
            <Link
              href={`/changes?id=${testCase.id}`}
              className="flex-1 rounded-full border border-slate-300 px-3 py-1.5 text-center text-slate-700 transition hover:bg-slate-100"
            >
              История изменений
            </Link>
            <Link
              href={`/export?id=${testCase.id}`}
              className="flex-1 rounded-full border border-slate-300 px-3 py-1.5 text-center text-slate-700 transition hover:bg-slate-100"
            >
              Экспорт
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}

function StepEditor({
  step,
  onChange,
}: {
  step: TestCaseStep;
  onChange: (
    id: string,
    field: keyof Pick<TestCaseStep, "action" | "expectedResult" | "notes">,
    value: string,
  ) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <header className="flex items-center justify-between">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
          Шаг {step.orderIndex}
        </span>
        <span className="text-[11px] text-slate-400">
          Обновлён {step.updatedAt ? formatDateTime(step.updatedAt) : formatDateTime(step.createdAt)}
        </span>
      </header>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        <span>Действие</span>
        <textarea
          value={step.action}
          onChange={(event) => onChange(step.id, "action", event.target.value)}
          rows={4}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        <span>Ожидаемый результат</span>
        <textarea
          value={step.expectedResult ?? ""}
          onChange={(event) => onChange(step.id, "expectedResult", event.target.value)}
          rows={3}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-500">
        <span>Дополнительно</span>
        <textarea
          value={step.notes ?? ""}
          onChange={(event) => onChange(step.id, "notes", event.target.value)}
          rows={3}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500"
        />
      </label>
    </div>
  );
}

function ContextPreview({ context }: { context: Record<string, unknown> | null }) {
  if (!context || Object.keys(context).length === 0) {
    return <p className="text-xs text-slate-500">Контекст ещё не задан. Можно добавить заметки перед перегенерацией.</p>;
  }

  const items = Object.entries(context)
    .filter(([, value]) => Array.isArray(value) && value.length > 0)
    .map(([key, value]) => ({ key, value: value as string[] }));

  if (items.length === 0) {
    return <p className="text-xs text-slate-500">Контекст пустой. Добавьте заметки перед перегенерацией.</p>;
  }

  return (
    <div className="space-y-3 text-xs text-slate-600">
      {items.map((item) => (
        <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{humanizeKey(item.key)}</p>
          <ul className="mt-2 space-y-1">
            {item.value.map((entry, index) => (
              <li key={`${item.key}-${index}`} className="rounded bg-white px-2 py-1 text-slate-700">
                {entry}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toContextBundle(testCase: TestCase, note: string): ContextBundle {
  const source = testCase.requirementContext ?? {};

  const asArray = (value: unknown): string[] => (Array.isArray(value) ? (value.filter((item) => typeof item === "string") as string[]) : []);

  const bundle: ContextBundle = {
    functionalRequirements: asArray(source["functional_requirements"]),
    functionalScenarios: asArray(source["functional_scenarios"]),
    userScenarios: asArray(source["user_scenarios"]),
    productSpecs: asArray(source["product_specs"]),
    acceptanceCriteria: asArray(source["acceptance_criteria"]),
    technicalConstraints: asArray(source["technical_constraints"]),
    urls: asArray(source["urls"]),
    rawContext: asArray(source["raw_context"]),
  };

  if (note.trim()) {
    bundle.rawContext = [...(bundle.rawContext ?? []), note.trim()];
  }

  return bundle;
}
