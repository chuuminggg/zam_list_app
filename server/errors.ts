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

/**
 * 외부 서비스가 오류 없이 결과만 비워서 보낸 경우. 실패가 아니라 200 + 빈 목록 + 안내(notice)로 응답한다.
 * (HTTP 오류로 내리면 브라우저 콘솔에 실패 요청으로 찍힌다.)
 */
export class WithheldResultsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WithheldResultsError';
  }
}

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
