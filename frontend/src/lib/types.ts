export type TestCaseStatus = "draft" | "active" | "archived";

export type TestCaseStep = {
  id: string;
  orderIndex: number;
  action: string;
  expectedResult: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type TestCaseRevision = {
  id: string;
  version: number;
  summary: string | null;
  changes: Record<string, unknown>;
  createdAt: string;
};

export type TestCase = {
  id: string;
  number: string;
  title: string;
  summary: string | null;
  author: string | null;
  precondition: string | null;
  postcondition: string | null;
  status: TestCaseStatus;
  requirementContext: Record<string, unknown> | null;
  sourceUrls: string[];
  version: number;
  latestGenerationSummary: string | null;
  steps: TestCaseStep[];
  revisions: TestCaseRevision[];
  createdAt: string;
  updatedAt: string | null;
};

export type TestCaseList = {
  items: TestCase[];
  total: number;
};

export type DocumentUpload = {
  id: string;
  name: string;
  mimeType: string | null;
  path: string;
  text: string | null;
};

export type ContextBundle = {
  functionalRequirements?: string[];
  functionalScenarios?: string[];
  userScenarios?: string[];
  productSpecs?: string[];
  acceptanceCriteria?: string[];
  technicalConstraints?: string[];
  urls?: string[];
  rawContext?: string[];
};

export type DocumentReference = {
  name: string;
  sourceType?: "upload" | "url" | "manual";
  text?: string | null;
  url?: string | null;
  fileId?: string | null;
  mimeType?: string | null;
};

export type GenerateTestCasePayload = {
  requestedTitle?: string | null;
  objective?: string | null;
  author?: string | null;
  context: ContextBundle;
  documents: DocumentReference[];
};

export type StepPatchPayload = {
  action?: string;
  expectedResult?: string | null;
  notes?: string | null;
  orderIndex?: number;
};
