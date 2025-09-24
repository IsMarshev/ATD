export type GenerationStatus = "completed" | "in-progress" | "failed" | "pending";

export type GenerationRecord = {
  id: string;
  project: string;
  name: string;
  model: string;
  status: GenerationStatus;
  createdAt: string;
  owner: string;
  steps: number;
  autoReruns: number;
  coverage: number;
  datapool: string;
  tags: string[];
};

export const generationHistory: GenerationRecord[] = [
  {
    id: "TC-4819",
    project: "Платформа биллинга",
    name: "Жизненный цикл подписки — позитивный сценарий",
    model: "Claude 3.5",
    status: "completed",
    createdAt: "2024-02-19T08:45:00Z",
    owner: "А. Кузнецова",
    steps: 14,
    autoReruns: 1,
    coverage: 92,
    datapool: "billing-subscription-v7.csv",
    tags: ["smoke", "critical"],
  },
  {
    id: "TC-4820",
    project: "Платформа биллинга",
    name: "Понижение тарифа в льготный период — пограничные кейсы",
    model: "GPT-4.1",
    status: "in-progress",
    createdAt: "2024-02-20T10:10:00Z",
    owner: "П. Жуков",
    steps: 21,
    autoReruns: 2,
    coverage: 87,
    datapool: "billing-grace-window.json",
    tags: ["regression", "retrying"],
  },
  {
    id: "TC-3660",
    project: "Единый вход",
    name: "Вход без пароля для нескольких арендаторов",
    model: "Sonnet 3.1",
    status: "failed",
    createdAt: "2024-02-18T18:05:00Z",
    owner: "И. Логинов",
    steps: 9,
    autoReruns: 3,
    coverage: 76,
    datapool: "sso-multi-tenant.yaml",
    tags: ["retrying", "needs-attention"],
  },
  {
    id: "TC-2490",
    project: "Единый вход",
    name: "Отзыв одноразовых кодов на разных устройствах",
    model: "GPT-4.1",
    status: "completed",
    createdAt: "2024-02-17T07:55:00Z",
    owner: "К. Лобанов",
    steps: 11,
    autoReruns: 0,
    coverage: 88,
    datapool: "otp-invalid-session.csv",
    tags: ["security", "mobile"],
  },
  {
    id: "TC-1099",
    project: "Витрина",
    name: "Оплата заказа с разбиением платежа",
    model: "Gemini 2.0",
    status: "completed",
    createdAt: "2024-02-16T14:30:00Z",
    owner: "М. Волкова",
    steps: 17,
    autoReruns: 0,
    coverage: 94,
    datapool: "checkout-split-pay.xlsx",
    tags: ["critical", "web"],
  },
  {
    id: "TC-1101",
    project: "Витрина",
    name: "Негативные сценарии гостевой покупки",
    model: "Claude 3.5",
    status: "pending",
    createdAt: "2024-02-20T09:20:00Z",
    owner: "М. Волкова",
    steps: 13,
    autoReruns: 0,
    coverage: 0,
    datapool: "checkout-negative.yaml",
    tags: ["draft"],
  },
];

export const projects = [
  "Платформа биллинга",
  "Единый вход",
  "Витрина",
  "Мобильный банкинг",
];

export const models = ["GPT-4.1", "Claude 3.5", "Gemini 2.0", "Sonnet 3.1"];

export const statusOptions: GenerationStatus[] = [
  "completed",
  "in-progress",
  "failed",
  "pending",
];

export type TestCaseStep = {
  id: string;
  action: string;
  data: string;
  expected: string;
  ruleHits?: string[];
  status: "ready" | "edited" | "pending";
};

export const activeTestCase = {
  id: "TC-4820",
  title: "Понижение тарифа в льготный период — пограничные кейсы",
  requirementCoverage: [
    { id: "REQ-1022", title: "Уведомление при старте понижения тарифа", coverage: 100 },
    { id: "REQ-1049", title: "Понижение активируется по завершении льготного окна", coverage: 75 },
    { id: "NONFUNC-34", title: "Аудит фиксирует событие", coverage: 60 },
  ],
  metadata: {
    project: "Платформа биллинга",
    model: "GPT-4.1",
    generatedAt: "2024-02-20T10:10:00Z",
    datapool: "billing-grace-window.json",
    regenerations: 2,
  },
  steps: [
    {
      id: "1",
      action: "Имитировать существующего подписчика в льготном периоде",
      data: "user_id=876234, plan=premium",
      expected: "На дашборде появляется баннер о предстоящем понижении",
      status: "ready",
    },
    {
      id: "2",
      action: "Инициировать понижение тарифа через админский API",
      data: "payload downgrade_plan=base",
      expected: "Система планирует событие понижения на конец льготного периода",
      status: "ready",
    },
    {
      id: "3",
      action: "Отправить вебхук об ошибке оплаты",
      data: "simulate event payment_failed",
      expected: "Политика повторов сохраняет расписание понижения",
      status: "edited",
      ruleHits: ["Политика повторов вебхука должна оставаться идемпотентной"],
    },
    {
      id: "4",
      action: "Перемотать системное время на 6 дней вперёд",
      data: "clock.advance days=6",
      expected: "Премиум доступ сохраняется, выводится предупреждение об окончании",
      status: "pending",
      ruleHits: ["После перемотки времени нужен шаг очистки"],
    },
    {
      id: "5",
      action: "Перемотать системное время на седьмой день",
      data: "clock.advance days=1",
      expected: "Задача понижения срабатывает, создаётся запись аудита",
      status: "pending",
      ruleHits: ["Проверить содержимое записи аудита"],
    },
  ] as TestCaseStep[],
  chat: [
    {
      id: "msg-1",
      author: "Система",
      role: "assistant" as const,
      timestamp: "2024-02-20T10:12:00Z",
      text: "Генерация завершена. Покрытие требований — 87%. Сообщите правки, которые нужно внести.",
    },
    {
      id: "msg-2",
      author: "П. Жуков",
      role: "user" as const,
      timestamp: "2024-02-20T10:14:00Z",
      text: "Добавь проверку на корректность записи аудита после понижения тарифа.",
    },
    {
      id: "msg-3",
      author: "Система",
      role: "assistant" as const,
      timestamp: "2024-02-20T10:14:15Z",
      text: "Записал уточнение. Шаг 5 дополнен проверкой содержимого аудита.",
    },
  ],
};

export type TestCaseGroup = {
  id: string;
  project: string;
  title: string;
  model: string;
  createdAt: string;
  status: GenerationStatus;
  cases: Array<{
    id: string;
    title: string;
    status: GenerationStatus;
    coverage: number;
  }>;
};

export const testCaseGroups: TestCaseGroup[] = [
  {
    id: "GRP-2024-02-20-001",
    project: "Платформа биллинга",
    title: "Переход с премиум-тарифа",
    model: "GPT-4.1",
    createdAt: "2024-02-20T10:10:00Z",
    status: "in-progress",
    cases: [
      {
        id: "TC-4820",
        title: "Понижение тарифа в льготный период — пограничные кейсы",
        status: "in-progress",
        coverage: 87,
      },
      {
        id: "TC-4821",
        title: "Уведомление клиента об окончании льготного периода",
        status: "pending",
        coverage: 0,
      },
      {
        id: "TC-4822",
        title: "Переключение тарифов при повторной оплате",
        status: "pending",
        coverage: 0,
      },
    ],
  },
  {
    id: "GRP-2024-02-19-004",
    project: "Витрина",
    title: "Негативные сценарии гостевой покупки",
    model: "Claude 3.5",
    createdAt: "2024-02-19T09:20:00Z",
    status: "completed",
    cases: [
      {
        id: "TC-1101",
        title: "Ошибки гостевой оплаты при пустой корзине",
        status: "completed",
        coverage: 92,
      },
      {
        id: "TC-1102",
        title: "Повторное оформление гостевого заказа",
        status: "completed",
        coverage: 90,
      },
      {
        id: "TC-1103",
        title: "Проверка ограничений на купоны для гостей",
        status: "completed",
        coverage: 88,
      },
    ],
  },
];

export type VersionDiff = {
  id: string;
  requirement: string;
  previous: string;
  current: string;
  status: "added" | "modified" | "removed";
  comment?: string;
};

export const changeSet: VersionDiff[] = [
  {
    id: "STEP-03",
    requirement: "REQ-1049",
    previous: "Убедиться, что понижение запланировано в течение 24 часов",
    current: "Обеспечить запуск понижения в конце льготного окна и сохранить идемпотентность повторов",
    status: "modified",
    comment: "Расширено, чтобы покрыть повторы вебхука",
  },
  {
    id: "STEP-05",
    requirement: "NONFUNC-34",
    previous: "Создаётся запись аудита",
    current: "Запись аудита включает correlation-id и источник понижения",
    status: "modified",
  },
  {
    id: "STEP-06",
    requirement: "REQ-1088",
    previous: "",
    current: "Уведомить владельца аккаунта о завершении льготного периода",
    status: "added",
  },
];

export type FieldMapping = {
  target: string;
  source: string;
  type: string;
  required: boolean;
  preview: string;
};

export const exportMappings: FieldMapping[] = [
  {
    target: "Резюме",
    source: "testCase.title",
    type: "Текст",
    required: true,
    preview: "Понижение тарифа в льготный период — пограничные кейсы",
  },
  {
    target: "Шаги",
    source: "steps[*]",
    type: "Массив шагов",
    required: true,
    preview: "5 шагов сопоставлено",
  },
  {
    target: "Датапул",
    source: "metadata.datapool",
    type: "Вложение",
    required: false,
    preview: "billing-grace-window.json",
  },
  {
    target: "Теги",
    source: "testCase.tags",
    type: "Множественный выбор",
    required: false,
    preview: "регрессия, повтор",
  },
];

export const exportLog = [
  {
    timestamp: "2024-02-20T11:45:00Z",
    channel: "Zephyr",
    status: "ok",
    details: "Пробный прогон прошёл успешно: 5 шагов, 3 вложения",
  },
  {
    timestamp: "2024-02-20T11:46:12Z",
    channel: "Adaptavist",
    status: "warning",
    details: "В проекте отсутствует настраиваемое поле `BusinessImpact`."
  },
];

export type IntegrationProfile = {
  id: string;
  name: string;
  description: string;
  url: string;
  project: string;
  status: "connected" | "pending" | "error";
  lastSync: string;
  authType: "PAT" | "OAuth" | "Basic";
};

export const integrations: IntegrationProfile[] = [
  {
    id: "integr-1",
    name: "Adaptavist QA",
    description: "Основное рабочее пространство Jira/Adaptavist",
    url: "https://adaptavist.example.com",
    project: "AT-CORE",
    status: "connected",
    lastSync: "2024-02-20T09:10:00Z",
    authType: "OAuth",
  },
  {
    id: "integr-2",
    name: "Zephyr Squad",
    description: "Облачный стенд Zephyr",
    url: "https://zephyr.example.com",
    project: "ZEPHYR-SANDBOX",
    status: "pending",
    lastSync: "2024-02-19T20:01:00Z",
    authType: "PAT",
  },
  {
    id: "integr-3",
    name: "Excel Templates",
    description: "Хранилище шаблонов Excel в общем доступе",
    url: "s3://test-cases/excel",
    project: "Shared",
    status: "connected",
    lastSync: "2024-02-19T07:45:00Z",
    authType: "Basic",
  },
];

export const testTypes = [
  "Смоук",
  "Регрессия",
  "Производительность",
  "Негативные",
  "Доступность",
  "Безопасность",
];
