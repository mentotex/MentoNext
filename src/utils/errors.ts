export class WPApiError extends Error {
  status?: number;
  cause?: unknown;

  constructor(message: string, status?: number, cause?: unknown) {
    super(message);
    this.name = 'WPApiError';
    this.status = status;
    this.cause = cause;
  }
}

export class WPNotFoundError extends WPApiError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'WPNotFoundError';
  }
}

export class WPNetworkError extends WPApiError {
  constructor(message = 'Network request failed', cause?: unknown) {
    super(message, undefined, cause);
    this.name = 'WPNetworkError';
  }
}

export class WPMenuAccessError extends WPApiError {
  constructor(message = 'WordPress blocked this menu request.') {
    super(message, 401);
    this.name = 'WPMenuAccessError';
  }
}

/**
 * Thrown when a response has an HTTP-success status but its body isn't
 * valid JSON — most commonly a security plugin/WAF's HTML challenge page,
 * a PHP fatal error dumping HTML output ahead of the JSON WordPress meant
 * to send, or a maintenance-mode page, all served with a 200. Distinct from
 * WPNetworkError (the request never got a response at all) and from a
 * generic WPApiError (a clean non-2xx status) — this is "got a response,
 * but WordPress's own output was broken," which needs a different fix on
 * the WordPress side (check for stray plugin output, PHP warnings printed
 * before headers, or a firewall rule) than either of those.
 */
export class WPInvalidResponseError extends WPApiError {
  constructor(message: string, status: number, cause?: unknown) {
    super(message, status, cause);
    this.name = 'WPInvalidResponseError';
  }
}
