import type { ApiErrorCode } from '../shared/api.js';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  RATE_LIMITED: 429,
  NOT_FOUND: 404,
  NOT_CONFIGURED: 503,
  PROVIDER_DISABLED: 503,
  UPSTREAM_ERROR: 502,
  TIMEOUT: 504,
  BLOCKED: 502,
  PARSE_ERROR: 502,
  INTERNAL: 500,
};

/** 클라이언트에 그대로 노출해도 되는 에러. 그 외 예외는 INTERNAL로 감싼다. */
export class ApiException extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'ApiException';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}
