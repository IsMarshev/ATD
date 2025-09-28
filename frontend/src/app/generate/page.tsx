"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { StatusPill } from "@/components/status-pill";
import { createGeneration, uploadDatapool } from "@/lib/api";
import type { Datapool, GenerationSummary, TestCaseDetail } from "@/lib/types";
import { formatDateTime } from "@/lib/time";
import { models, projects, testTypes } from "@/data/mockData";

const defaultSelectedTypes = new Set(["Регрессия", "Негативные"]);

export default function GeneratePage() {
  const [title, setTitle] = useState("Новый тест-кейс");
  const [selectedProject, setSelectedProject] = useState(projects[0]);
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(defaultSelectedTypes);
  const [autoRerun, setAutoRerun] = useState(true);
  const [guardrails, setGuardrails] = useState({
    stability: true,
    nonFunctional: true,
    timeTravel: true,
  });
  const [description, setDescription] = useState("");
  const [datapool, setDatapool] = useState<Datapool | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [generationResult, setGenerationResult] = useState<GenerationSummary | null>(null);
  const [primaryCase, setPrimaryCase] = useState<TestCaseDetail | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const summary = useMemo(() => {
    const estimatedSteps = 5 + selectedTypes.size * 2;
    return {
      estimatedSteps,
      coverageGoal: autoRerun ? 90 : 80,
      guardsEnabled: Object.values(guardrails).filter(Boolean).length,
    };
  }, [selectedTypes, autoRerun, guardrails]);

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

  async function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadDatapool(file, description || undefined);
      setDatapool(uploaded);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Не удалось загрузить датапул");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleGenerate() {
    if (!title.trim()) {
      setGenerateError("Укажите название тест-кейса");
      return;
    }
    if (selectedTypes.size === 0) {
      setGenerateError("Выберите хотя бы один тип сценария");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    try {
      const { generation, primaryCase } = await createGeneration({
        title: title.trim(),
        project: selectedProject,
        modelName: selectedModel,
        datapoolId: datapool?.id ?? null,
        description: description.trim() || null,
        testTypes: Array.from(selectedTypes),
        guardrails,
        autoRerun,
        coverageTarget: summary.coverageGoal,
        tags: Array.from(selectedTypes).map((item) => item.toLowerCase()),
      });
      setGenerationResult(generation);
      setPrimaryCase(primaryCase);
      setTitle(`Новый сценарий ${generation.reference}`);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Генерация завершилась ошибкой");
    } finally {
      setIsGenerating(false);
    }
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
                  disabled={isUploading}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? "Загрузка…" : "Загрузить файл"}
                </button>
                <button
                  type="button"
                  className="cursor-not-allowed rounded-full border border-slate-300 px-3 py-1.5 text-slate-400"
                  title="Поддержка URL в разработке"
                >
                  Добавить URL
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                <span>Название кейса</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-500"
                  placeholder="Опишите основную цель сценария"
                />
              </label>
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
              <label className="flex flex-col gap-1 text-xs text-slate-500 sm:col-span-2">
                <span>Описание датапула</span>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="billing-grace-window.json"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-500"
                />
              </label>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" multiple={false} onChange={handleFileSelection} />
            {uploadError ? (
              <p className="text-xs text-rose-600">{uploadError}</p>
            ) : null}
            {datapool ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                <p className="font-semibold">{datapool.originalFilename}</p>
                <p>Размер: {(datapool.sizeBytes / 1024).toFixed(1)} КБ • Загрузили {formatDateTime(datapool.uploadedAt)}</p>
              </div>
            ) : null}
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
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Выбор модели и проверок</h2>
              <p className="text-xs text-slate-500">Настройте эвристики перед запуском генерации.</p>
            </div>
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
            {datapool ? <SummaryItem label="Датапул" value={datapool.originalFilename} /> : null}
          </div>
          {generateError ? <p className="text-xs text-rose-600">{generateError}</p> : null}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full rounded-full bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? "Запуск…" : "Запустить генерацию"}
          </button>
          <button className="w-full rounded-full border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Загрузить сохранённый кейс
          </button>
          <GeneratedGroupPreview generation={generationResult} testCase={primaryCase} />
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

function GeneratedGroupPreview({
  generation,
  testCase,
}: {
  generation: GenerationSummary | null;
  testCase: TestCaseDetail | null;
}) {
  if (!generation || !testCase) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
      <div className="flex items-center justify-between">
        <div>
          <p className="uppercase tracking-wide text-slate-500">Группа</p>
          <p className="text-sm font-semibold text-slate-800">{generation.title}</p>
        </div>
        <StatusPill status={generation.status} />
      </div>
      <p>Проект: {generation.project}</p>
      <p>Сгенерировано: {formatDateTime(generation.createdAt)}</p>
      <ul className="mt-2 space-y-1">
        {generation.cases.map((item) => (
          <li key={item.id} className="flex items-center justify-between">
            <Link href={`/editor?id=${item.id}`} className="font-semibold text-slate-800 hover:underline">
              {item.reference}
            </Link>
            <span className="text-slate-500">{item.status}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">
        Основной кейс: <Link href={`/editor?id=${testCase.id}`} className="text-slate-700 hover:underline">{testCase.reference}</Link>
      </p>
    </div>
  );
}
