// Same origin in dev (Vite proxy) and Docker (nginx), so relative URLs reach the API.
const API_BASE = '/api/v1';

/** The API's error body: see AllExceptionsFilter. Validation errors carry a list of messages. */
type ErrorBody = {
  statusCode: number;
  error: string;
  message: string | string[];
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const isErrorBody = (body: unknown): body is ErrorBody =>
  typeof body === 'object' &&
  body !== null &&
  'statusCode' in body &&
  'message' in body;

export async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body: unknown =
    response.status === 204
      ? undefined
      : await response.json().catch(() => undefined);
  if (response.ok) return body as T;

  const message = isErrorBody(body)
    ? [body.message].flat().join('. ')
    : `Request failed (${response.status})`;
  throw new ApiError(response.status, message);
}
