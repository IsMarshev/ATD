export const projects = [
  "Платформа биллинга",
  "Единый вход",
  "Витрина",
  "Мобильный банкинг",
];

export const models = ["GPT-4.1", "Claude 3.5", "Gemini 2.0", "Sonnet 3.1"];

export const testTypes = [
  "Регрессия",
  "Негативные",
  "Позитивные",
  "Нефункциональные",
  "Интеграционные",
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
    lastSync: "2024-02-18T12:45:00Z",
    authType: "PAT",
  },
  {
    id: "integr-3",
    name: "Excel Reports",
    description: "Периодическая выгрузка в Excel",
    url: "https://files.example.com/qa",
    project: "QA-EXPORTS",
    status: "connected",
    lastSync: "2024-02-19T16:20:00Z",
    authType: "Basic",
  },
];
