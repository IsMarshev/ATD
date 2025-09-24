"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import { activeTestCase, testCaseGroups, type TestCaseStep } from "@/data/mockData";
import { formatDateTime } from "@/lib/time";

export default function CaseEditorPage() {
  const [steps, setSteps] = useState<TestCaseStep[]>(activeTestCase.steps);
  const [selectedStepId, setSelectedStepId] = useState(activeTestCase.steps[0]?.id ?? "");
  const [draftMessage, setDraftMessage] = useState("");

  function updateStep(id: string, field: keyof TestCaseStep, value: string) {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id
          ? {
              ...step,
              [field]: value,
              status: field !== "status" ? "edited" : step.status,
            }
          : step,
      ),
    );
  }

  const relatedGroup = useMemo(
    () =>
      testCaseGroups.find((group) =>
        group.cases.some((testCase) => testCase.id === activeTestCase.id),
      ),
    [],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">Редактор кейса</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{activeTestCase.title}</h1>
          <StatusPill status="in-progress" />
        </div>
        <p className="text-sm text-slate-600">
          Сгенерирован {formatDateTime(activeTestCase.metadata.generatedAt)} • Модель {activeTestCase.metadata.model}
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-4">
          <ChatPanel
            history={activeTestCase.chat}
            draft={draftMessage}
            onDraftChange={setDraftMessage}
          />

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
                {relatedGroup.cases.map((testCase) => (
                  <li key={testCase.id} className="flex items-center justify-between">
                    <Link href={`/editor?id=${testCase.id}`} className="font-semibold text-slate-800 hover:underline">
                      {testCase.id}
                    </Link>
                    <span className="text-slate-500">{testCase.status}</span>
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
                    className={`border-b border-slate-100 align-top hover:bg-slate-50 ${
                      selectedStepId === step.id ? "bg-slate-50" : ""
                    }`}
                  >
                    <td className="px-3 py-3 text-xs text-slate-500">{step.id}</td>
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
              {activeTestCase.requirementCoverage.map((requirement) => (
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
  if (rules.length === 0) {
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
  history: typeof activeTestCase.chat;
  draft: string;
  onDraftChange: (text: string) => void;
}) {
  return (
    <section className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Чат с моделью</h2>
        <span className="text-xs text-slate-500">Ответ в пределах минуты</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        {history.map((message) => (
          <ChatMessage key={message.id} {...message} />
        ))}
      </div>
      <label className="flex flex-col gap-2 text-xs text-slate-500">
        <span>Новый запрос</span>
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          rows={3}
          placeholder="Опишите, что нужно изменить или добавить"
          className="rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
        />
      </label>
      <button className="self-end rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
        Отправить сообщение
      </button>
    </section>
  );
}

function ChatMessage({
  author,
  role,
  timestamp,
  text,
}: (typeof activeTestCase.chat)[number]) {
  const isAssistant = role === "assistant";
  return (
    <div className={`flex flex-col gap-1 rounded-xl border px-3 py-2 ${
      isAssistant
        ? "border-slate-200 bg-white text-slate-700"
        : "border-slate-300 bg-slate-100 text-slate-700"
    }`}>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span className="font-semibold text-slate-700">{author}</span>
        <span>{timestamp}</span>
      </div>
      <p className="text-xs leading-relaxed text-slate-700">{text}</p>
    </div>
  );
}
