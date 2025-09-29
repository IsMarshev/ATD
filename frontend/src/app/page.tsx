"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { StatusPill } from "@/components/status-pill";
import { listTestCases } from "@/lib/api";
import type { TestCase } from "@/lib/types";
import { formatDateTime } from "@/lib/time";

const STATUS_FILTERS = ["all", "draft", "active", "archived"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

type DashboardStats = {
  total: number;
  drafts: number;
  active: number;
  archived: number;
  lastCreatedAt: string | null;
};

export default function DashboardPage() {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await listTestCases();
        if (!cancelled) {
          setTestCases(response.items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить тест-кейсы");
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

  const filteredTestCases = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return testCases.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesSearch =
        searchValue.length === 0 ||
        item.title.toLowerCase().includes(searchValue) ||
        item.number.toLowerCase().includes(searchValue) ||
        (item.author ?? "").toLowerCase().includes(searchValue);
      return matchesStatus && matchesSearch;
    });
  }, [testCases, statusFilter, search]);

  const stats = useMemo<DashboardStats>(() => {
    if (testCases.length === 0) {
      return { total: 0, drafts: 0, active: 0, archived: 0, lastCreatedAt: null };
    }
    let drafts = 0;
    let active = 0;
    let archived = 0;
    let lastCreatedAt: string | null = null;
    testCases.forEach((testCase) => {
      if (testCase.status === "draft") {
        drafts += 1;
      } else if (testCase.status === "active") {
        active += 1;
      } else if (testCase.status === "archived") {
        archived += 1;
      }
      if (!lastCreatedAt || testCase.createdAt > lastCreatedAt) {
        lastCreatedAt = testCase.createdAt;
      }
    });
    return {
      total: testCases.length,
      drafts,
      active,
      archived,
      lastCreatedAt,
    };
  }, [testCases]);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900">Тест-кейсы</h1>
          <p className="text-sm text-slate-600">
            Следите за статусом сгенерированных кейсов и переходите к редактированию или экспорту.
          </p>
        </header>
        <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile label="Всего" value={stats.total.toString()} />
          <SummaryTile label="Черновики" value={stats.drafts.toString()} />
          <SummaryTile label="Активные" value={stats.active.toString()} />
          <SummaryTile
            label="Свежий кейс"
            value={stats.lastCreatedAt ? formatDateTime(stats.lastCreatedAt) : "—"}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-end">
          <SearchInput value={search} onChange={setSearch} />
          <FilterSelect
            label="Статус"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            options={STATUS_FILTERS}
          />
        </div>
      </section>

      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Список кейсов</h2>
          <span className="text-xs text-slate-500">
            {loading ? "загрузка..." : `${filteredTestCases.length} шт. по фильтру`}
          </span>
        </header>

        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
        ) : null}

        {!error && loading ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
            Загружаем данные…
          </p>
        ) : null}

        {!loading && !error && filteredTestCases.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
            По выбранным условиям ничего не найдено. Сбросьте фильтры или попробуйте другой запрос.
          </p>
        ) : null}

        {!loading && !error && filteredTestCases.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Номер</th>
                  <th className="px-4 py-3 text-left">Название</th>
                  <th className="px-4 py-3 text-left">Автор</th>
                  <th className="px-4 py-3 text-left">Статус</th>
                  <th className="px-4 py-3 text-left">Шагов</th>
                  <th className="px-4 py-3 text-left">Создан</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredTestCases.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.number}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      {item.summary ? (
                        <p className="text-xs text-slate-500">{item.summary}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{item.author ?? "—"}</td>
                    <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{item.steps.length}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-3 text-right text-xs">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/editor?id=${item.id}`}
                          className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 transition hover:bg-slate-100"
                        >
                          Редактор
                        </Link>
                        <Link
                          href={`/export?id=${item.id}`}
                          className="rounded-full border border-slate-300 px-3 py-1 text-slate-700 transition hover:bg-slate-100"
                        >
                          Экспорт
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">
      <span>Поиск</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Название, номер или автор"
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-500"
      />
    </label>
  );
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
  options: readonly string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-500">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-500"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-white text-slate-700">
            {option === "all" ? "Все" : option === "draft" ? "Черновик" : option === "active" ? "Активный" : "Архив"}
          </option>
        ))}
      </select>
    </label>
  );
}
