import { API_BASE_URL } from "./config";
import {
  ChatMessage,
  Datapool,
  ExportRecord,
  ExportRequestPayload,
  GenerationCreatePayload,
  GenerationSummary,
  TestCaseDetail,
  TestCaseStep,
  TestCaseSummary,
  StepUpdate,
} from "./types";

const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

type ApiGenerationSummary = {
  id: string;
  reference: string;
  title: string;
  project: string;
  model_name: string;
  status: string;
  created_at: string;
  auto_rerun_enabled: boolean;
  auto_reruns: number;
  coverage_target: number;
  guardrails: Record<string, boolean>;
  test_types: string[];
  last_error: string | null;
  cases: ApiTestCaseSummary[];
};

type ApiTestCaseSummary = {
  id: string;
  generation_id: string;
  reference: string;
  title: string;
  status: string;
  coverage: number;
  project: string;
  model_name: string;
  auto_reruns: number;
  regeneration_count: number;
  generated_at: string;
};

type ApiRequirementCoverage = {
  id: string;
  title: string;
  coverage: number;
};

type ApiTestCaseStep = {
  id: string;
  position: number;
  action: string;
  data: string;
  expected: string;
  rule_hits: string[];
  status: string;
};

type ApiChatMessage = {
  id: string;
  author: string;
  role: string;
  message: string;
  timestamp: string;
};

type ApiExportRecord = {
  id: string;
  channel: string;
  status: string;
  details: string | null;
  created_at: string;
  location: string | null;
};

type ApiTestCaseDetail = ApiTestCaseSummary & {
  requirement_coverage: ApiRequirementCoverage[];
  metadata: Record<string, unknown>;
  tags: string[];
  steps: ApiTestCaseStep[];
  chat_messages: ApiChatMessage[];
  exports: ApiExportRecord[];
};

type ApiDatapool = {
  id: string;
  original_filename: string;
  description: string | null;
  content_type: string | null;
  size_bytes: number;
  uploaded_at: string;
};

type ApiGenerationCreateResponse = {
  generation: ApiGenerationSummary;
  primary_case: ApiTestCaseDetail;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...init,
  });

  if (!response.ok) {
    let message = `API request failed with status ${response.status}`;
    try {
      const data = await response.json();
      const detail = (data as { detail?: unknown }).detail;
      if (typeof detail === "string") {
        message = detail;
      }
    } catch (error) {
      // ignore JSON parse errors and fall back to default message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function mapTestCaseSummary(payload: ApiTestCaseSummary): TestCaseSummary {
  return {
    id: payload.id,
    generationId: payload.generation_id,
    reference: payload.reference,
    title: payload.title,
    status: payload.status as TestCaseSummary["status"],
    coverage: payload.coverage,
    project: payload.project,
    modelName: payload.model_name,
    autoReruns: payload.auto_reruns,
    regenerationCount: payload.regeneration_count,
    generatedAt: payload.generated_at,
  };
}

function mapTestCaseStep(payload: ApiTestCaseStep): TestCaseStep {
  return {
    id: payload.id,
    position: payload.position,
    action: payload.action,
    data: payload.data,
    expected: payload.expected,
    ruleHits: payload.rule_hits,
    status: payload.status as TestCaseStep["status"],
  };
}

function mapChatMessage(payload: ApiChatMessage): ChatMessage {
  return {
    id: payload.id,
    author: payload.author,
    role: payload.role as ChatMessage["role"],
    message: payload.message,
    timestamp: payload.timestamp,
  };
}

function mapExportRecord(payload: ApiExportRecord): ExportRecord {
  return {
    id: payload.id,
    channel: payload.channel as ExportRecord["channel"],
    status: payload.status as ExportRecord["status"],
    details: payload.details,
    createdAt: payload.created_at,
    location: payload.location,
  };
}

function mapTestCaseDetail(payload: ApiTestCaseDetail): TestCaseDetail {
  const summary = mapTestCaseSummary(payload);
  return {
    ...summary,
    requirementCoverage: payload.requirement_coverage.map((item) => ({
      id: item.id,
      title: item.title,
      coverage: item.coverage,
    })),
    metadata: payload.metadata ?? {},
    tags: payload.tags,
    steps: payload.steps.sort((a, b) => a.position - b.position).map(mapTestCaseStep),
    chatMessages: payload.chat_messages.map(mapChatMessage),
    exports: payload.exports.map(mapExportRecord),
  };
}

function mapGenerationSummary(payload: ApiGenerationSummary): GenerationSummary {
  return {
    id: payload.id,
    reference: payload.reference,
    title: payload.title,
    project: payload.project,
    modelName: payload.model_name,
    status: payload.status as GenerationSummary["status"],
    createdAt: payload.created_at,
    autoRerunEnabled: payload.auto_rerun_enabled,
    autoReruns: payload.auto_reruns,
    coverageTarget: payload.coverage_target,
    guardrails: payload.guardrails,
    testTypes: payload.test_types,
    lastError: payload.last_error,
    cases: payload.cases.map(mapTestCaseSummary),
  };
}

function mapDatapool(payload: ApiDatapool): Datapool {
  return {
    id: payload.id,
    originalFilename: payload.original_filename,
    description: payload.description,
    contentType: payload.content_type,
    sizeBytes: payload.size_bytes,
    uploadedAt: payload.uploaded_at,
  };
}

export async function fetchGenerations(): Promise<GenerationSummary[]> {
  const payload = await request<ApiGenerationSummary[]>("/generations");
  return payload.map(mapGenerationSummary);
}

export async function fetchGeneration(id: string): Promise<GenerationSummary> {
  const payload = await request<ApiGenerationSummary>(`/generations/${id}`);
  return mapGenerationSummary(payload);
}

export async function createGeneration(
  payload: GenerationCreatePayload,
): Promise<{ generation: GenerationSummary; primaryCase: TestCaseDetail }> {
  const body = {
    title: payload.title,
    project: payload.project,
    model_name: payload.modelName,
    datapool_id: payload.datapoolId ?? null,
    description: payload.description ?? null,
    test_types: payload.testTypes,
    guardrails: payload.guardrails,
    auto_rerun: payload.autoRerun,
    coverage_target: payload.coverageTarget ?? null,
    tags: payload.tags ?? [],
  };

  const response = await request<ApiGenerationCreateResponse>("/generations", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });

  return {
    generation: mapGenerationSummary(response.generation),
    primaryCase: mapTestCaseDetail(response.primary_case),
  };
}

export async function fetchTestCase(testCaseId: string): Promise<TestCaseDetail> {
  const payload = await request<ApiTestCaseDetail>(`/test-cases/${testCaseId}`);
  return mapTestCaseDetail(payload);
}

export async function fetchTestCaseByReference(reference: string): Promise<TestCaseDetail> {
  const payload = await request<ApiTestCaseDetail>(`/test-cases/by-reference/${reference}`);
  return mapTestCaseDetail(payload);
}

export async function listTestCases(): Promise<TestCaseSummary[]> {
  const payload = await request<ApiTestCaseSummary[]>("/test-cases");
  return payload.map(mapTestCaseSummary);
}

export async function updateTestCaseSteps(
  testCaseId: string,
  updates: StepUpdate[],
): Promise<TestCaseDetail> {
  const body = {
    steps: updates.map((step) => ({
      id: step.id,
      action: step.action,
      data: step.data,
      expected: step.expected,
      status: step.status,
    })),
  };

  const payload = await request<ApiTestCaseDetail>(`/test-cases/${testCaseId}/steps`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });

  return mapTestCaseDetail(payload);
}

export async function regenerateTestCase(
  testCaseId: string,
  options: { reason?: string; autoRerun?: boolean } = {},
): Promise<TestCaseDetail> {
  const body = {
    reason: options.reason ?? null,
    auto_rerun: options.autoRerun ?? true,
  };

  const payload = await request<{ test_case: ApiTestCaseDetail }>(`/test-cases/${testCaseId}/regenerate`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });

  return mapTestCaseDetail(payload.test_case);
}

export async function createExport(
  testCaseId: string,
  payload: ExportRequestPayload,
): Promise<ExportRecord> {
  const body = {
    channel: payload.channel,
    include_datapool: payload.includeDatapool ?? true,
    notes: payload.notes ?? null,
    file_name: payload.fileName ?? null,
  };

  const response = await request<ApiExportRecord>(`/test-cases/${testCaseId}/exports`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });

  return mapExportRecord(response);
}

export async function fetchExportHistory(testCaseId: string): Promise<ExportRecord[]> {
  const payload = await request<ApiExportRecord[]>(`/test-cases/${testCaseId}/exports`);
  return payload.map(mapExportRecord);
}

export async function uploadDatapool(file: File, description?: string): Promise<Datapool> {
  const formData = new FormData();
  formData.append("file", file);
  if (description) {
    formData.append("description", description);
  }

  const payload = await request<ApiDatapool>("/datapools", {
    method: "POST",
    body: formData,
  });

  return mapDatapool(payload);
}

export async function listDatapools(): Promise<Datapool[]> {
  const payload = await request<ApiDatapool[]>("/datapools");
  return payload.map(mapDatapool);
}
