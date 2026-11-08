import type { components } from './schema';

/** Types generated from the backend OpenAPI contract (npm run api:types). */
export type Schemas = components['schemas'];
export type HealthReport = Schemas['HealthReport'];
export type EnvironmentInventory = Schemas['EnvironmentInventory'];
export type RuntimeComponent = Schemas['RuntimeComponent'];
export type HostMetricsSample = Schemas['HostMetricsSample'];
export type HostMetricsHistory = Schemas['HostMetricsHistory'];
export type AuditPage = Schemas['AuditPage'];
export type AuditEvent = Schemas['AuditEvent'];
export type AuditVerification = Schemas['AuditVerification'];
export type AiProviderList = Schemas['AiProviderList'];
export type AiProviderStatus = Schemas['AiProviderStatus'];
export type AiModel = Schemas['AiModel'];
export type AiModelList = Schemas['AiModelList'];
export type AiDiscoveryResult = Schemas['AiDiscoveryResult'];
export type AiChatRequest = Schemas['AiChatRequest'];
export type AiChatResponse = Schemas['AiChatResponse'];
export type Agent = Schemas['Agent'];
export type AgentList = Schemas['AgentList'];
export type AgentUpdateRequest = Schemas['AgentUpdateRequest'];
export type AgentMemory = Schemas['AgentMemory'];
export type AgentMemoryList = Schemas['AgentMemoryList'];
export type AgentRunRequest = Schemas['AgentRunRequest'];
export type AgentRun = Schemas['AgentRun'];
export type AgentRunDetail = Schemas['AgentRunDetail'];
export type AgentRunPage = Schemas['AgentRunPage'];
export type AgentAutoAllRequest = Schemas['AgentAutoAllRequest'];
export type AgentAutoAllResult = Schemas['AgentAutoAllResult'];
export type AgentSuggestResult = Schemas['AgentSuggestResult'];
export type AuthStatus = Schemas['AuthStatus'];
export type CurrentUser = Schemas['CurrentUser'];
export type Permission = CurrentUser['permissions'][number];
export type User = Schemas['User'];
export type UserList = Schemas['UserList'];
export type UserCreateRequest = Schemas['UserCreateRequest'];
export type UserUpdateRequest = Schemas['UserUpdateRequest'];
export type Tool = Schemas['Tool'];
export type ToolList = Schemas['ToolList'];
export type ToolDiscoveryResult = Schemas['ToolDiscoveryResult'];
export type Scope = Schemas['Scope'];
export type ScopeList = Schemas['ScopeList'];
export type ScopeCreateRequest = Schemas['ScopeCreateRequest'];
export type Operation = Schemas['Operation'];
export type OperationList = Schemas['OperationList'];
export type Job = Schemas['Job'];
export type JobPage = Schemas['JobPage'];
export type EngineStatus = Schemas['EngineStatus'];
export type Finding = Schemas['Finding'];
export type FindingPage = Schemas['FindingPage'];
export type FindingUpdateRequest = Schemas['FindingUpdateRequest'];
export type Evidence = Schemas['Evidence'];
export type EvidenceDetail = Schemas['EvidenceDetail'];
export type EvidencePage = Schemas['EvidencePage'];
export type EvidenceUpdateRequest = Schemas['EvidenceUpdateRequest'];
export type Ioc = Schemas['Ioc'];
export type IocPage = Schemas['IocPage'];
export type IocCreateRequest = Schemas['IocCreateRequest'];
export type IocUpdateRequest = Schemas['IocUpdateRequest'];
export type Report = Schemas['Report'];
export type ReportDetail = Schemas['ReportDetail'];
export type ReportPage = Schemas['ReportPage'];
export type ReportCreateRequest = Schemas['ReportCreateRequest'];

/**
 * The backend is always the same machine as this console (loopback by default; LAN/Tailscale when the
 * operator has deliberately opened it up — see docs/architecture/roadmap.md). A single build-time
 * NEXT_PUBLIC_API_BASE_URL bakes in exactly one of those addresses, so switching between e.g. 127.0.0.1,
 * a LAN IP and a Tailscale IP silently breaks every address but the one last built for ("Backend unreachable"
 * even though the backend is right there) — this bit the operator directly on 2026-11-07. In the browser,
 * derive the API host from whatever address the page itself was loaded from instead: same host, fixed port.
 * NEXT_PUBLIC_API_BASE_URL still applies for anything without a window (SSR) and as the explicit fallback.
 */
const API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? '7411';
export const API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname
    ? `${window.location.protocol}//${window.location.hostname}:${API_PORT}`
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? `http://127.0.0.1:${API_PORT}`).replace(/\/+$/, '');
export const API_PREFIX = '/api/v1';

/** Dispatched on window whenever the API answers 401, so the auth gate can show the sign-in screen. */
export const UNAUTHORIZED_EVENT = 'dark-agi:unauthorized';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Builds an API URL; query values are encoded, undefined values dropped. */
export function apiUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const url = new URL(`${API_BASE_URL}${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const { query, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(apiUrl(path, query), {
      ...rest,
      headers: { Accept: 'application/json', ...rest.headers },
      cache: 'no-store',
      // Session is an httpOnly cookie set by the backend; it must accompany every request.
      credentials: 'include',
    });
  } catch (error) {
    throw new ApiError(0, `Backend unreachable at ${API_BASE_URL} (${error instanceof Error ? error.message : 'network error'})`, null);
  }
  const text = await response.text();
  const body: unknown = text ? safeJson(text) : null;
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : `HTTP ${response.status}`;
    if (response.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(response.status, message, body);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** SWR fetcher: key is the API path (query string allowed). */
export const swrFetcher = <T,>(path: string): Promise<T> => apiRequest<T>(path);
