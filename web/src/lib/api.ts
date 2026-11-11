// Same origin in dev (Vite proxy) and Docker (nginx), so relative URLs reach the API.
const API_BASE = '/api/v1';
export const HttpStatus = {
	NoContent: 204,
	BadRequest: 400,
	Unauthorized: 401,
	NotFound: 404,
	Conflict: 409,
	TooManyRequests: 429,
	ServiceUnavailable: 503
} as const;

/** The API's error body: see AllExceptionsFilter. Validation errors carry a list of messages. */
type ErrorBody = {
	statusCode: number;
	error: string;
	message: string | string[];
};

export class ApiError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
	}
}

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type RequestOptions = {
	body?: unknown;
	accessToken?: string;
};

const isErrorBody = (body: unknown): body is ErrorBody =>
	typeof body === 'object' && body !== null && 'statusCode' in body && 'message' in body;

export async function request<T>(
	method: HttpMethod,
	path: string,
	{ body, accessToken }: RequestOptions = {}
): Promise<T> {
	const headers: Record<string, string> = {};
	if (body !== undefined) headers['Content-Type'] = 'application/json';
	if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

	const response = await fetch(`${API_BASE}${path}`, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const responseBody: unknown =
		response.status === HttpStatus.NoContent
			? undefined
			: await response.json().catch(() => undefined);
	if (response.ok) return responseBody as T;

	const message = isErrorBody(responseBody)
		? [responseBody.message].flat().join('. ')
		: `Request failed (${response.status})`;
	throw new ApiError(response.status, message);
}

export const postJson = <T>(path: string, body: unknown) => request<T>('POST', path, { body });
