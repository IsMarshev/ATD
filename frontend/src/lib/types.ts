export type GenerationStatus = "pending" | "in-progress" | "completed" | "failed";
export type StepStatus = "ready" | "edited" | "pending";
export type ChatRole = "system" | "assistant" | "user";
export type ExportChannel = "Adaptavist" | "Zephyr" | "Excel";
export type ExportStatus = "ok" | "warning" | "error";

export type TestCaseSummary = {
  id: string;
  generationId: string;
  reference: string;
  title: string;
  status: GenerationStatus;
  coverage: number;
  project: string;
  modelName: string;
  autoReruns: number;
  regenerationCount: number;
  generatedAt: string;
};

export type GenerationSummary = {
  id: string;
  reference: string;
  title: string;
  project: string;
  modelName: string;
  status: GenerationStatus;
  createdAt: string;
  autoRerunEnabled: boolean;
  autoReruns: number;
  coverageTarget: number;
  guardrails: Record<string, boolean>;
  testTypes: string[];
  lastError: string | null;
  cases: TestCaseSummary[];
};

export type RequirementCoverage = {
  id: string;
  title: string;
  coverage: number;
};

export type TestCaseStep = {
  id: string;
  position: number;
  action: string;
  data: string;
  expected: string;
  ruleHits: string[];
  status: StepStatus;
};

export type ChatMessage = {
  id: string;
  author: string;
  role: ChatRole;
  message: string;
  timestamp: string;
};

export type ExportRecord = {
  id: string;
  channel: ExportChannel;
  status: ExportStatus;
  details: string | null;
  createdAt: string;
  location: string | null;
};

export type TestCaseDetail = TestCaseSummary & {
  requirementCoverage: RequirementCoverage[];
  metadata: Record<string, unknown>;
  tags: string[];
  steps: TestCaseStep[];
  chatMessages: ChatMessage[];
  exports: ExportRecord[];
};

export type Datapool = {
  id: string;
  originalFilename: string;
  description: string | null;
  contentType: string | null;
  sizeBytes: number;
  uploadedAt: string;
};

export type GenerationCreatePayload = {
  title: string;
  project: string;
  modelName: string;
  datapoolId?: string | null;
  description?: string | null;
  testTypes: string[];
  guardrails: Record<string, boolean>;
  autoRerun: boolean;
  coverageTarget?: number | null;
  tags?: string[];
};

export type StepUpdate = Partial<Pick<TestCaseStep, "action" | "data" | "expected" | "status">> & {
  id: string;
};

export type ExportRequestPayload = {
  channel: ExportChannel;
  includeDatapool?: boolean;
  notes?: string;
  fileName?: string;
};
