"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { StatusPill } from "@/components/status-pill";
import { fetchGeneration, fetchTestCase, regenerateTestCase, updateTestCaseSteps } from "@/lib/api";
import type { GenerationSummary, TestCaseDetail, TestCaseStep } from "@/lib/types";
import { formatDateTime } from "@/lib/time";

export default function CaseEditorPage() {
  const searchParams = useSearchParams();
  const testCaseId = searchParams.get("id");

  const [testCase, setTestCase] = useState<TestCaseDetail | null>(null);
  const [generation, setGeneration] = useState<GenerationSummary | null>(null);
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

  useEffect(() => {
    if (!testCase) {
      return;
    }

    let cancelled = false;

    fetchGeneration(testCase.generationId)
      .then((run) => {
        if (!cancelled) {
          setGeneration(run);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGeneration(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [testCase]);

  function updateStep(id: string, field: keyof Pick<TestCaseStep, "action" | "data" | "expected">, value: string) {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id
          ? {
              ...step,
              [field]: value,
              status: field !== "status" && step.status === "ready" ? "edited" : step.status,
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
        original.data !== step.data ||
        original.expected !== step.expected ||
        original.status !== step.status
      ) {
        updates.push(step);
      }
    });
    return updates;
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
      const updated = await updateTestCaseSteps(
        testCase.id,
        modified.map((step) => ({
          id: step.id,
          action: step.action,
          data: step.data,
          expected: step.expected,
          status: step.status,
        })),
      );
      setTestCase(updated);
      setSteps(updated.steps);
      originalSteps.current = new Map(updated.steps.map((step) => [step.id, step]));
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
      const updated = await regenerateTestCase(testCase.id, {
        reason: draftMessage || undefined,
        autoRerun: true,
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

  const relatedGroup = useMemo(() => {
    if (!generation || !testCase) {
      return null;
    }
    return generation;
  }, [generation, testCase]);

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
        <p className="text-xs uppercase tracking-wide text-slate-500">Редактор кейса</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{testCase.title}</h1>
          <StatusPill status={testCase.status} />
        </div>
        <p className="text-sm text-slate-600">
          Сгенерирован {formatDateTime(testCase.generatedAt)} • Модель {testCase.modelName} • Покрытие {testCase.coverage}%
        </p>
        {notification ? <p className="text-xs text-emerald-600">{notification}</p> : null}
      </header>

      <section className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Сохранить изменения
        </button>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={saving}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Перегенерировать
        </button>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-4">
          <ChatPanel history={testCase.chatMessages} draft={draftMessage} onDraftChange={setDraftMessage} />

          {relatedGroup ? (
            <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="uppercase tracking-wide text-slate-500">Группа</p>
                  <p className="text-sm font-semibold text-slate-800">{relatedGroup.title}</p>
                </div>
                <StatusPill status={relatedGroup.status} />
              </div>
              <p>Проект: {relatedGroup.project}</p>
              <ul className="mt-2 space-y-1">
                {relatedGroup.cases.map((caseItem) => (
                  <li key={caseItem.id} className="flex items-center justify-between">
                    <Link href={`/editor?id=${caseItem.id}`} className="font-semibold text-slate-800 hover:underline">
                      {caseItem.reference}
                    </Link>
                    <span className="text-slate-500">{caseItem.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">№</th>
                  <th className="px-3 py-2">Действие</th>
                  <th className="px-3 py-2">Данные</th>
                  <th className="px-3 py-2">Ожидание</th>
                  <th className="px-3 py-2">Проверки</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step) => (
                  <tr
                    key={step.id}
                    onClick={() => setSelectedStepId(step.id)}
                    className={`border-b border-slate-100 align-top hover:bg-slate-50 ${selectedStepId === step.id ? "bg-slate-50" : ""}`}
                  >
                    <td className="px-3 py-3 text-xs text-slate-500">{step.position}</td>
                    <td className="px-3 py-3">
                      <Textarea
                        value={step.action}
                        onChange={(value) => updateStep(step.id, "action", value)}
                        highlight={step.status === "edited"}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Textarea
                        value={step.data}
                        onChange={(value) => updateStep(step.id, "data", value)}
                        monospace
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Textarea
                        value={step.expected}
                        onChange={(value) => updateStep(step.id, "expected", value)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <RuleList rules={step.ruleHits ?? []} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <h2 className="text-lg font-semibold text-slate-900">Покрытие требований</h2>
            <ul className="space-y-2">
              {testCase.requirementCoverage.map((requirement) => (
                <li key={requirement.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{requirement.id}</span>
                    <span className="text-sm text-slate-600">{requirement.coverage}%</span>
                  </div>
                  <p className="text-xs text-slate-500">{requirement.title}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </div>
  );
}

function Textarea({
  value,
  onChange,
  highlight,
  monospace,
}: {
  value: string;
  onChange: (value: string) => void;
  highlight?: boolean;
  monospace?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`min-h-[80px] w-full rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none ${
        highlight ? "ring-1 ring-slate-400" : ""
      } ${monospace ? "font-mono text-xs" : ""}`}
    />
  );
}

function RuleList({ rules }: { rules: string[] }) {
  if (!rules || rules.length === 0) {
    return <span className="text-xs text-emerald-600">Без нарушений</span>;
  }
  return (
    <ul className="space-y-2 text-xs text-rose-600">
      {rules.map((rule) => (
        <li key={rule} className="rounded-lg border border-rose-200 bg-rose-50 p-2">
          {rule}
        </li>
      ))}
    </ul>
  );
}

function ChatPanel({
  history,
  draft,
  onDraftChange,
}: {
  history: TestCaseDetail["chatMessages"];
  draft: string;
  onDraftChange: (text: string) => void;
}) {
  return (
    <section className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Чат с моделью</h2>
        <span className="text-xs text-slate-500">{history.length} сообщений</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3">
        {history.map((message) => (
          <article key={message.id} className="space-y-1 rounded-lg border border-slate-200 bg-white p-3">
            <header className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{message.author}</span>
              <span>{formatDateTime(message.timestamp)}</span>
            </header>
            <p className="text-sm text-slate-700">{message.message}</p>
          </article>
        ))}
        {history.length === 0 ? (
          <p className="text-xs text-slate-500">Диалогов пока нет.</p>
        ) : null}
      </div>
      <label className="space-y-2">
        <span className="text-xs text-slate-500">Комментарий для модели</span>
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Опишите правки или причину перегенерации..."
          className="w-full rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
        />
      </label>
    </section>
  );
}
