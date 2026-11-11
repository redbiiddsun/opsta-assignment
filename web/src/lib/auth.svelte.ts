import { ApiError, postJson } from '#lib/api.ts';

export type Credentials = { email: string; password: string };

type AuthSessionResponse = {
	accessToken: string;
	tokenType: string;
	expiresIn: string;
	refreshToken: string;
	refreshTokenExpiresAt: string;
};

export type Session = { email: string; accessToken: string; refreshToken: string };

const STORAGE_KEY = 'auth-session';
const HTTP_UNAUTHORIZED = 401;
const HTTP_CONFLICT = 409;
const HTTP_TOO_MANY_REQUESTS = 429;

/*
 * ponytail: the API returns tokens in the body (no cookies), so the session lives in localStorage and survives a
 * reload. An XSS bug could read it; httpOnly refresh cookies are the upgrade path. Access-token refresh via
 * /auth/refresh is not wired yet – add it with the first authenticated page.
 */
function readStoredSession(): Session | null {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? (JSON.parse(stored) as Session) : null;
	} catch {
		return null;
	}
}

function storeSession(session: Session | null) {
	try {
		if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
		else localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Storage blocked (private mode): the session still works until the tab closes
	}
}

let session = $state<Session | null>(readStoredSession());

/** Turns API failures into text a person can act on; the API already avoids user enumeration on login. */
export function describeAuthError(error: unknown): string {
	if (!(error instanceof ApiError)) return 'Could not reach the server. Check your connection and try again.';
	switch (error.status) {
		case HTTP_UNAUTHORIZED:
			return 'Email or password is incorrect.';
		case HTTP_CONFLICT:
			return 'An account with this email already exists.';
		case HTTP_TOO_MANY_REQUESTS:
			return 'Too many attempts. Wait a minute and try again.';
		default:
			return error.message;
	}
}

export const auth = {
	get session() {
		return session;
	},

	async login(credentials: Credentials) {
		const response = await postJson<AuthSessionResponse>('/auth/login', credentials);
		// The API stores emails lowercased (users/domain/value-objects/email.vo.ts), so mirror it here
		session = { email: credentials.email.toLowerCase(), accessToken: response.accessToken, refreshToken: response.refreshToken };
		storeSession(session);
	},

	/** Creates the account only – the register endpoint returns the user, not tokens, so callers sign in separately */
	async register(credentials: Credentials) {
		await postJson('/auth/register', credentials);
	},

	logout() {
		const refreshToken = session?.refreshToken;
		session = null;
		storeSession(null);
		// Revoking server-side is best-effort: the local session is already gone either way
		if (refreshToken) void postJson('/auth/logout', { refreshToken }).catch(() => undefined);
	}
};
