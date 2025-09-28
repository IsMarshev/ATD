"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { StatusPill } from "@/components/status-pill";
import { fetchGenerations } from "@/lib/api";
import type { GenerationSummary } from "@/lib/types";
import { formatDateTime, formatRelative } from "@/lib/time";

const STATUS_FILTERS = ["all", "completed", "in-progress", "failed", "pending"] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

type Stats = {
  lastCreatedAt: string | null;
  autoReruns: number;
  coverage: number;
  groupsCount: number;
  casesCount: number;
};

export default function DashboardPage() {
  const [generations, setGenerations] = useState<GenerationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectFilter, setProjectFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchGenerations();
        if (!cancelled) {
          setGenerations(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить данные");
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
  }, []);

  const projectOptions = useMemo(() => {
    const values = new Set<string>();
    generations.forEach((generation) => values.add(generation.project));
    return ["all", ...Array.from(values)];
  }, [generations]);

  const modelOptions = useMemo(() => {
    const values = new Set<string>();
    generations.forEach((generation) => values.add(generation.modelName));
    return ["all", ...Array.from(values)];
  }, [generations]);

  const filteredGenerations = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return generations.filter((generation) => {
      const matchesProject = projectFilter === "all" || generation.project === projectFilter;
      const matchesModel = modelFilter === "all" || generation.modelName === modelFilter;
      const matchesStatus =
        statusFilter === "all" ||
        generation.status === statusFilter ||
        generation.cases.some((testCase) => testCase.status === statusFilter);

      const matchesSearch =
        searchValue.length === 0 ||
        generation.title.toLowerCase().includes(searchValue) ||
        generation.reference.toLowerCase().includes(searchValue) ||
        generation.cases.some((testCase) =>
          testCase.reference.toLowerCase().includes(searchValue) ||
          testCase.title.toLowerCase().includes(searchValue),
        );

      return matchesProject && matchesModel && matchesStatus && matchesSearch;
    });
  }, [generations, projectFilter, modelFilter, statusFilter, search]);

  const stats = useMemo<Stats>(() => calculateStats(filteredGenerations), [filteredGenerations]);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">История генераций</h1>
          <p className="text-sm text-slate-600">
            Кейсы сгруппированы по запуску генерации — выберите проект, модель и откройте нужный сценарий.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryTile
            label="Последний запуск"
            value={stats.lastCreatedAt ? formatRelative(stats.lastCreatedAt) : "—"}
          />
          <SummaryTile label="Группы" value={`${stats.groupsCount}`} />
          <SummaryTile label="Кейсы" value={`${stats.casesCount}`} />
          <SummaryTile label="Среднее покрытие" value={stats.coverage ? `${stats.coverage}%` : "—"} />
          <SummaryTile label="Автоповторы" value={`${stats.autoReruns}`} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-end">
          <SearchInput value={search} onChange={setSearch} />
          <FilterSelect
            label="Проект"
            value={projectFilter}
            onChange={setProjectFilter}
            options={projectOptions}
          />
          <FilterSelect label="Модель" value={modelFilter} onChange={setModelFilter} options={modelOptions} />
          <FilterSelect
            label="Статус"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            options={STATUS_FILTERS}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Группы генераций</h2>
          <span className="text-xs text-slate-500">
            {loading ? "загрузка..." : `${filteredGenerations.length} групп по фильтрам`}
          </span>
        </div>

        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
        ) : null}

        {!error && loading ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
            Загружаем данные о генерациях…
          </p>
        ) : null}

        {!loading && !error && filteredGenerations.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
            По выбранным условиям групп не найдено. Измените параметры фильтрации.
          </p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {filteredGenerations.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      </section>
    </div>
  );
}

function calculateStats(groups: GenerationSummary[]): Stats {
  if (groups.length === 0) {
    return { lastCreatedAt: null, autoReruns: 0, coverage: 0, groupsCount: 0, casesCount: 0 };
  }

  let latest = 0;
  let autoReruns = 0;
  let coverageSum = 0;
  let coverageCount = 0;
  let casesCount = 0;

  groups.forEach((group) => {
    const createdAt = new Date(group.createdAt).getTime();
    if (!Number.isNaN(createdAt) && createdAt > latest) {
      latest = createdAt;
    }
    group.cases.forEach((testCase) => {
      casesCount += 1;
      if (testCase.coverage > 0) {
        coverageSum += testCase.coverage;
        coverageCount += 1;
      }
    });
    autoReruns += group.autoReruns;
  });

  return {
    lastCreatedAt: latest ? new Date(latest).toISOString() : null,
    autoReruns,
    coverage: coverageCount ? Math.round(coverageSum / coverageCount) : 0,
    groupsCount: groups.length,
    casesCount,
  };
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="flex min-w-[160px] flex-col gap-1 text-xs text-slate-500">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-white text-slate-700">
            {option === "all" ? "Все" : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">
      <span>Поиск</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Название группы, ID кейса или сценарий"
        className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
      />
    </label>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function GroupCard({ group }: { group: GenerationSummary }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-500">{group.project}</p>
          <h3 className="text-base font-semibold text-slate-900">{group.title}</h3>
        </div>
        <StatusPill status={group.status} />
      </div>
      <p className="text-xs text-slate-500">Создано {formatDateTime(group.createdAt)} • {group.modelName}</p>
      <ul className="space-y-2 text-xs">
        {group.cases.map((testCase) => (
          <li
            key={testCase.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <div className="flex flex-col">
              <Link href={`/editor?id=${testCase.id}`} className="font-semibold text-slate-800 hover:underline">
                {testCase.reference}
              </Link>
              <span className="text-slate-500">{testCase.title}</span>
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <StatusPill status={testCase.status} />
              <span className="text-[11px] text-slate-500">Покрытие: {testCase.coverage}%</span>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
