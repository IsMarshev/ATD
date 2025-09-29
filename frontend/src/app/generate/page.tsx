"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { uploadDocument, generateTestCase } from "@/lib/api";
import type { DocumentUpload, TestCase } from "@/lib/types";
import { formatDateTime } from "@/lib/time";
import { models, projects, testTypes } from "@/data/mockData";

const defaultSelectedTypes = new Set(["Регрессия", "Негативные"]);

export default function GeneratePage() {
  const [requestedTitle, setRequestedTitle] = useState("Новый тест-кейс");
  const [selectedProject, setSelectedProject] = useState(projects[0]);
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [objective, setObjective] = useState("");
  const [author, setAuthor] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(defaultSelectedTypes);
  const [notes, setNotes] = useState("");

  const [documentInfo, setDocumentInfo] = useState<DocumentUpload | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [generatedCase, setGeneratedCase] = useState<TestCase | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const summary = useMemo(() => {
    const estimatedSteps = 5 + selectedTypes.size * 2;
    return {
      estimatedSteps,
      notes: documentInfo ? "Документ загружен" : "Документ не приложен",
    };
  }, [selectedTypes, documentInfo]);

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
      const uploaded = await uploadDocument(file);
      setDocumentInfo(uploaded);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Не удалось загрузить документ");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleGenerate() {
    if (!requestedTitle.trim()) {
      setGenerateError("Укажите название тест-кейса");
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    try {
      const contextRaw = [
        selectedProject ? `Проект: ${selectedProject}` : null,
        selectedModel ? `Модель: ${selectedModel}` : null,
        objective ? `Цель: ${objective}` : null,
        notes ? `Комментарий: ${notes}` : null,
        documentInfo ? `Документ: ${documentInfo.name}` : null,
      ].filter((value): value is string => Boolean(value));

      const payload = {
        requestedTitle: requestedTitle.trim(),
        objective: objective.trim() || null,
        author: author.trim() || null,
        context: {
          functionalScenarios: Array.from(selectedTypes),
          rawContext: contextRaw,
        },
        documents: documentInfo
          ? [
              {
                name: documentInfo.name,
                fileId: documentInfo.id,
                mimeType: documentInfo.mimeType ?? undefined,
                sourceType: "upload" as const,
              },
            ]
          : [],
      };

      const testCase = await generateTestCase(payload);
      setGeneratedCase(testCase);
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
          Загрузите документ, опишите цель и получите тест-кейс, готовый к проверке и экспорту.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">Данные для генерации</h2>
                <p className="text-xs text-slate-500">Можно приложить требования или таблицу с данными.</p>
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? "Загрузка…" : documentInfo ? "Заменить файл" : "Загрузить файл"}
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
                  value={requestedTitle}
                  onChange={(event) => setRequestedTitle(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-500"
                  placeholder="Опишите основную цель сценария"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                <span>Автор</span>
                <input
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                  placeholder="QA инженер"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-500"
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
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                <span>Модель</span>
                <select
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500"
                >
                  {models.map((model) => (
                    <option key={model} value={model} className="bg-white text-slate-700">
                      {model}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500 sm:col-span-2">
                <span>Цель</span>
                <textarea
                  value={objective}
                  onChange={(event) => setObjective(event.target.value)}
                  placeholder="Что нужно проверить?"
                  rows={3}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-500"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500 sm:col-span-2">
                <span>Комментарий</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Особенности сценария, ограничения, ожидания"
                  rows={3}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-500"
                />
              </label>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" multiple={false} onChange={handleFileSelection} />
            {uploadError ? (
              <p className="text-xs text-rose-600">{uploadError}</p>
            ) : null}
            {documentInfo ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                <p className="font-semibold">{documentInfo.name}</p>
                <p>Тип: {documentInfo.mimeType ?? "неизвестно"} • Загрузка {formatDateTime(new Date().toISOString())}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Области тестирования</h2>
              <p className="text-xs text-slate-500">Выберите акценты, которые должны попасть в сценарий.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {testTypes.map((type) => {
                const active = selectedTypes.has(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleTestType(type)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Итоги перед запуском</p>
            <ul className="mt-3 space-y-2 text-xs text-slate-500">
              <li>• Типов сценариев: {selectedTypes.size}</li>
              <li>• Ожидаемое количество шагов: {summary.estimatedSteps}</li>
              <li>• {summary.notes}</li>
            </ul>
            {generateError ? <p className="mt-3 text-xs text-rose-600">{generateError}</p> : null}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-4 w-full rounded-full bg-slate-900 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? "Генерируем…" : "Запустить"}
            </button>
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-slate-900">Результат</h2>
          {generatedCase ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Готово {formatDateTime(generatedCase.createdAt)}</p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{generatedCase.title}</p>
                <p className="mt-1 text-xs text-slate-500">Номер {generatedCase.number}</p>
                {generatedCase.summary ? (
                  <p className="mt-2 text-sm text-slate-700">{generatedCase.summary}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">Шагов: {generatedCase.steps.length}</p>
              </div>
              <Link
                href={`/editor?id=${generatedCase.id}`}
                className="flex w-full items-center justify-center rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Перейти в редактор
              </Link>
              <Link
                href={`/export?id=${generatedCase.id}`}
                className="flex w-full items-center justify-center rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Экспортировать
              </Link>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              После генерации здесь появится краткое описание и ссылки для дальнейшей работы с кейсом.
            </p>
          )}
        </aside>
      </section>
    </div>
  );
}
