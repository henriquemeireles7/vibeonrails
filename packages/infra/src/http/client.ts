/**
 * HTTP Client — Fetch wrapper with timeouts, retries, and exponential backoff.
 *
 * Creates an HTTP client that wraps native `fetch` with:
 * - Configurable request timeouts via AbortController
 * - Automatic retry with exponential backoff on 5xx or network errors
 * - Typed error classes for timeout and HTTP errors
 *
 * Usage:
 *   const client = createHttpClient({ baseUrl: 'https://api.example.com', timeout: 5000 });
 *   const data = await client.get('/users');
 */

/** Options for creating an HTTP client instance. */
export interface HttpClientOptions {
  /** Base URL prepended to all request paths. */
  baseUrl: string;
  /** Request timeout in milliseconds (default: 10000). */
  timeout?: number;
  /** Number of retry attempts on 5xx or network errors (default: 2). */
  retries?: number;
  /** Base delay between retries in milliseconds, doubled each attempt (default: 1000). */
  retryDelay?: number;
}

/** Error thrown when a request exceeds the configured timeout. */
export class HttpTimeoutError extends Error {
  constructor(url: string, timeout: number) {
    super(`Request to ${url} timed out after ${timeout}ms`);
    this.name = "HttpTimeoutError";
  }
}

/** Error thrown when the server responds with a non-2xx status. */
export class HttpResponseError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly url: string;

  constructor(url: string, status: number, statusText: string) {
    super(`HTTP ${status} ${statusText} from ${url}`);
    this.name = "HttpResponseError";
    this.status = status;
    this.statusText = statusText;
    this.url = url;
  }
}

/** HTTP client interface returned by createHttpClient. */
export interface HttpClient {
  /** Perform a GET request. */
  get<T = unknown>(path: string, init?: RequestInit): Promise<T>;
  /** Perform a POST request with a JSON body. */
  post<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
  /** Perform a PUT request with a JSON body. */
  put<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
  /** Perform a DELETE request. */
  delete<T = unknown>(path: string, init?: RequestInit): Promise<T>;
}

/**
 * Determine whether a failed request should be retried.
 * Retries on network errors and 5xx server errors.
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof HttpResponseError) {
    return error.status >= 500;
  }
  return error instanceof TypeError || error instanceof HttpTimeoutError;
}

/**
 * Execute a fetch request with AbortController timeout.
 */
async function fetchWithTimeout(
  url: string,
  timeout: number,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HttpTimeoutError(url, timeout);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Create an HTTP client with configurable timeouts and retry behavior.
 *
 * @param options - Client configuration
 * @returns HttpClient instance with get, post, put, delete methods
 */
export function createHttpClient(options: HttpClientOptions): HttpClient {
  const {
    baseUrl,
    timeout = 10_000,
    retries = 2,
    retryDelay = 1000,
  } = options;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${baseUrl}${path}`;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetchWithTimeout(url, timeout, init);

        if (!response.ok) {
          throw new HttpResponseError(url, response.status, response.statusText);
        }

        const text = await response.text();
        return text ? (JSON.parse(text) as T) : (undefined as T);
      } catch (error: unknown) {
        lastError = error;

        if (attempt < retries && isRetryable(error)) {
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  function jsonInit(method: string, body?: unknown, init?: RequestInit): RequestInit {
    return {
      ...init,
      method,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };
  }

  return {
    get<T = unknown>(path: string, init?: RequestInit): Promise<T> {
      return request<T>(path, { ...init, method: "GET" });
    },

    post<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
      return request<T>(path, jsonInit("POST", body, init));
    },

    put<T = unknown>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
      return request<T>(path, jsonInit("PUT", body, init));
    },

    delete<T = unknown>(path: string, init?: RequestInit): Promise<T> {
      return request<T>(path, { ...init, method: "DELETE" });
    },
  };
}
