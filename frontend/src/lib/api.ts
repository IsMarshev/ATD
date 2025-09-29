import { API_BASE_URL } from "./config";
import type {
  ContextBundle,
  DocumentReference,
  DocumentUpload,
  GenerateTestCasePayload,
  StepPatchPayload,
  TestCase,
  TestCaseList,
  TestCaseRevision,
  TestCaseStep,
} from "./types";

const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
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

type ApiStep = {
  id: string;
  order_index: number;
  action: string;
  expected_result: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

type ApiRevision = {
  id: string;
  version: number;
  summary: string | null;
  changes: Record<string, unknown>;
  created_at: string;
};

type ApiTestCase = {
  id: string;
  number: string;
  title: string;
  summary: string | null;
  author: string | null;
  precondition: string | null;
  postcondition: string | null;
  status: "draft" | "active" | "archived";
  requirement_context: Record<string, unknown> | null;
  source_urls: string[];
  version: number;
  latest_generation_summary: string | null;
  steps: ApiStep[];
  revisions: ApiRevision[];
  created_at: string;
  updated_at: string | null;
};

type ApiTestCaseList = {
  items: ApiTestCase[];
  total: number;
};

type ApiDocumentUpload = {
  id: string;
  name: string;
  mime_type: string | null;
  path: string;
  text: string | null;
};

function mapStep(payload: ApiStep): TestCaseStep {
  return {
    id: payload.id,
    orderIndex: payload.order_index,
    action: payload.action,
    expectedResult: payload.expected_result,
    notes: payload.notes,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
  };
}

function mapRevision(payload: ApiRevision): TestCaseRevision {
  return {
    id: payload.id,
    version: payload.version,
    summary: payload.summary,
    changes: payload.changes,
    createdAt: payload.created_at,
  };
}

function mapTestCase(payload: ApiTestCase): TestCase {
  return {
    id: payload.id,
    number: payload.number,
    title: payload.title,
    summary: payload.summary,
    author: payload.author,
    precondition: payload.precondition,
    postcondition: payload.postcondition,
    status: payload.status,
    requirementContext: payload.requirement_context,
    sourceUrls: payload.source_urls,
    version: payload.version,
    latestGenerationSummary: payload.latest_generation_summary,
    steps: payload.steps.map(mapStep),
    revisions: payload.revisions.map(mapRevision),
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
  };
}

function mapDocument(payload: ApiDocumentUpload): DocumentUpload {
  return {
    id: payload.id,
    name: payload.name,
    mimeType: payload.mime_type,
    path: payload.path,
    text: payload.text,
  };
}

function serializeContext(context: ContextBundle): Record<string, unknown> {
  return {
    functional_requirements: context.functionalRequirements ?? [],
    functional_scenarios: context.functionalScenarios ?? [],
    user_scenarios: context.userScenarios ?? [],
    product_specs: context.productSpecs ?? [],
    acceptance_criteria: context.acceptanceCriteria ?? [],
    technical_constraints: context.technicalConstraints ?? [],
    urls: context.urls ?? [],
    raw_context: context.rawContext ?? [],
  };
}

function serializeDocument(document: DocumentReference): Record<string, unknown> {
  return {
    name: document.name,
    source_type: document.sourceType ?? "upload",
    text: document.text,
    url: document.url,
    file_id: document.fileId,
    mime_type: document.mimeType,
  };
}

export async function listTestCases(): Promise<TestCaseList> {
  const payload = await request<ApiTestCaseList>("/test-cases");
  return {
    items: payload.items.map(mapTestCase),
    total: payload.total,
  };
}

export async function fetchTestCase(testCaseId: string): Promise<TestCase> {
  const payload = await request<ApiTestCase>(`/test-cases/${testCaseId}`);
  return mapTestCase(payload);
}

export async function uploadDocument(file: File): Promise<DocumentUpload> {
  const formData = new FormData();
  formData.append("file", file);
  const payload = await request<ApiDocumentUpload>("/documents/upload", {
    method: "POST",
    body: formData,
  });
  return mapDocument(payload);
}

export async function generateTestCase(payload: GenerateTestCasePayload): Promise<TestCase> {
  const body = {
    requested_title: payload.requestedTitle ?? null,
    objective: payload.objective ?? null,
    author: payload.author ?? null,
    context: serializeContext(payload.context),
    documents: payload.documents.map(serializeDocument),
    datapool_hints: [],
  };
  const response = await request<ApiTestCase>("/test-cases/generate", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  return mapTestCase(response);
}

export async function updateTestCase(
  testCaseId: string,
  payload: Partial<Pick<TestCase, "title" | "summary" | "author" | "precondition" | "postcondition" | "status">>,
): Promise<TestCase> {
  const body = {
    title: payload.title ?? null,
    summary: payload.summary ?? null,
    author: payload.author ?? null,
    precondition: payload.precondition ?? null,
    postcondition: payload.postcondition ?? null,
    status: payload.status ?? null,
  };
  const response = await request<ApiTestCase>(`/test-cases/${testCaseId}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  return mapTestCase(response);
}

export async function updateTestCaseStep(
  testCaseId: string,
  stepId: string,
  payload: StepPatchPayload,
): Promise<TestCase> {
  const body = {
    action: payload.action,
    expected_result: payload.expectedResult,
    notes: payload.notes,
    order_index: payload.orderIndex,
  };
  const response = await request<ApiTestCase>(`/test-cases/${testCaseId}/steps/${stepId}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  return mapTestCase(response);
}

type DiffRequest = {
  context: ContextBundle;
  documents?: DocumentReference[];
  existingSteps: TestCaseStep[];
};

export async function regenerateTestCase(
  testCaseId: string,
  payload: DiffRequest,
): Promise<TestCase> {
  const body = {
    test_case_id: testCaseId,
    context: serializeContext(payload.context),
    documents: (payload.documents ?? []).map(serializeDocument),
    existing_steps: payload.existingSteps.map((step) => ({
      order_index: step.orderIndex,
      action: step.action,
      expected_result: step.expectedResult,
      notes: step.notes,
    })),
  };
  const response = await request<ApiTestCase>(`/test-cases/${testCaseId}/diff`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  return mapTestCase(response);
}

export function buildExportUrl(testCaseId: string, format: "excel" | "csv" | "adaptavist" | "zephyr" = "excel"): string {
  const search = new URLSearchParams({ format });
  return `${API_BASE_URL}/test-cases/${testCaseId}/export?${search.toString()}`;
}
