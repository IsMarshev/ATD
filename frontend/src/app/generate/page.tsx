"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import { models, projects, testCaseGroups, testTypes } from "@/data/mockData";
import { formatDateTime } from "@/lib/time";

const defaultSelectedTypes = new Set(["Регрессия", "Негативные"]);

export default function GeneratePage() {
  const [selectedProject, setSelectedProject] = useState(projects[0]);
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(defaultSelectedTypes);
  const [autoRerun, setAutoRerun] = useState(true);
  const [guardrails, setGuardrails] = useState({
    stability: true,
    nonFunctional: true,
    timeTravel: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const summary = useMemo(() => {
    const estimatedSteps = 5 + selectedTypes.size * 2;
    return {
      estimatedSteps,
      coverageGoal: autoRerun ? 90 : 80,
      guardsEnabled: Object.values(guardrails).filter(Boolean).length,
    };
  }, [selectedTypes.size, autoRerun, guardrails]);

  function toggleTestType(type: string) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Новая генерация</h1>
        <p className="text-sm text-slate-600">
          Загрузите датапул, выберите модель и включите необходимые проверки перед запуском генерации тест-кейса.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">Датапул и проект</h2>
                <p className="text-xs text-slate-500">Поддерживаются таблицы, документы требований и ссылки.</p>
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                >
                  Загрузить файл
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                >
                  Добавить URL
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                <span>Проект</span>
                <select
                  value={selectedProject}
                  onChange={(event) => setSelectedProject(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500"
                >
                  {projects.map((project) => (
                    <option key={project} value={project} className="bg-white text-slate-700">
                      {project}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                <span>Описание датапула</span>
                <input
                  placeholder="billing-grace-window.json"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-500"
                />
              </label>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" multiple />
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Области тестирования</h2>
              <p className="text-xs text-slate-500">Отметьте акценты, которые должны попасть в сценарий.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {testTypes.map((type) => {
                const active = selectedTypes.has(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleTestType(type)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      active
                        ? "border-slate-700 bg-slate-200 text-slate-800"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-500"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {models.map((model) => {
                const active = selectedModel === model;
                const subtitle =
                  model === "GPT-4.1"
                    ? "Максимум рассуждений"
                    : model === "Claude 3.5"
                      ? "Баланс риска и качества"
                      : model === "Gemini 2.0"
                        ? "Мультимодальный контекст"
                        : "Экономичный резерв";
                return (
                  <button
                    key={model}
                    type="button"
                    onClick={() => setSelectedModel(model)}
                    className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left text-sm transition ${
                      active
                        ? "border-slate-700 bg-slate-100 text-slate-800"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-500"
                    }`}
                  >
                    <span className="font-semibold">{model}</span>
                    <span className="text-xs text-slate-500">{subtitle}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 text-sm text-slate-600">
              <ToggleRow
                label="Эвристики стабильности"
                description="Отслеживать падение покрытия и отсутствие шагов очистки."
                value={guardrails.stability}
                onChange={(value) => setGuardrails((prev) => ({ ...prev, stability: value }))}
              />
              <ToggleRow
                label="Нефункциональные проверки"
                description="Добавлять шаги доступности и аудита при необходимости."
                value={guardrails.nonFunctional}
                onChange={(value) => setGuardrails((prev) => ({ ...prev, nonFunctional: value }))}
              />
              <ToggleRow
                label="Гигиена перемотки времени"
                description="Требовать явный откат после изменения времени."
                value={guardrails.timeTravel}
                onChange={(value) => setGuardrails((prev) => ({ ...prev, timeTravel: value }))}
              />
              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span>Автоповтор при падении покрытия</span>
                <input
                  type="checkbox"
                  checked={autoRerun}
                  onChange={(event) => setAutoRerun(event.target.checked)}
                  className="h-4 w-4 rounded border border-slate-300"
                />
              </label>
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Сводка</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <SummaryItem label="Модель" value={selectedModel} />
            <SummaryItem label="Проект" value={selectedProject} />
            <SummaryItem label="Выбранные типы" value={`${selectedTypes.size}`} />
            <SummaryItem label="Оценка шагов" value={`~${summary.estimatedSteps}`} />
            <SummaryItem label="Целевое покрытие" value={`${summary.coverageGoal}%`} />
            <SummaryItem label="Активных правил" value={`${summary.guardsEnabled}`} />
          </div>
          <div className="space-y-2 text-xs text-slate-500">
            <p>Автоматическая проверка:</p>
            <StatusPill status="completed" />
          </div>
          <button className="w-full rounded-full bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
            Запустить генерацию
          </button>
          <button className="w-full rounded-full border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Загрузить сохранённый кейс
          </button>
          <GeneratedGroupPreview />
        </aside>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <span className="text-xs text-slate-500">{description}</span>
      <div className="flex justify-end">
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border border-slate-300"
        />
      </div>
    </label>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function GeneratedGroupPreview() {
  const group = testCaseGroups[0];
  if (!group) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
      <div className="flex items-center justify-between">
        <div>
          <p className="uppercase tracking-wide text-slate-500">Группа</p>
          <p className="text-sm font-semibold text-slate-800">{group.title}</p>
        </div>
        <StatusPill status={group.status} />
      </div>
      <p>Проект: {group.project}</p>
      <p>Сгенерировано: {formatDateTime(group.createdAt)}</p>
      <ul className="mt-2 space-y-1">
        {group.cases.map((item) => (
          <li key={item.id} className="flex items-center justify-between">
            <Link href={`/editor?id=${item.id}`} className="font-semibold text-slate-800 hover:underline">
              {item.id}
            </Link>
            <span className="text-slate-500">{item.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
