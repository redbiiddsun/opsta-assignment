import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { ApiError, HttpStatus, postJson, request, type HttpMethod } from '#lib/api.ts';

export type Credentials = { email: string; password: string };

type AuthSessionResponse = {
	accessToken: string;
	tokenType: string;
	expiresIn: string;
	refreshToken: string;
	refreshTokenExpiresAt: string;
};

export type Session = {
	email: string;
	accessToken: string;
	refreshToken: string;
};

const STORAGE_KEY = 'auth-session';

/*
 * ponytail: the API returns tokens in the body (no cookies), so the session lives in localStorage and survives a
 * reload. An XSS bug could read it; httpOnly refresh cookies are the upgrade path.
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
	if (!(error instanceof ApiError))
		return 'Could not reach the server. Check your connection and try again.';
	switch (error.status) {
		case HttpStatus.Unauthorized:
			return 'Email or password is incorrect.';
		case HttpStatus.Conflict:
			return 'An account with this email already exists.';
		case HttpStatus.TooManyRequests:
			return 'Too many attempts. Wait a minute and try again.';
		default:
			return error.message;
	}
}

// Refresh tokens are single-use, so parallel 401s must share one renewal instead of racing to spend the token
let pendingRenewal: Promise<boolean> | null = null;

function renewSession(): Promise<boolean> {
	pendingRenewal ??= refreshTokens().finally(() => (pendingRenewal = null));
	return pendingRenewal;
}

async function refreshTokens(): Promise<boolean> {
	const current = session;
	if (!current) return false;
	let response: AuthSessionResponse;
	try {
		response = await postJson<AuthSessionResponse>('/auth/refresh', {
			refreshToken: current.refreshToken
		});
	} catch (error) {
		// Only a refused refresh token ends the session; a network blip or 5xx must not sign the person out
		if (isRefreshRefused(error)) return false;
		throw error;
	}
	// Signed out or switched account while the refresh was in flight: don't resurrect the old session
	if (session !== current) return false;
	session = {
		...current,
		accessToken: response.accessToken,
		refreshToken: response.refreshToken
	};
	storeSession(session);
	return true;
}

function isRefreshRefused(error: unknown): boolean {
	return (
		error instanceof ApiError &&
		(error.status === HttpStatus.Unauthorized || error.status === HttpStatus.BadRequest)
	);
}

export const auth = {
	get session() {
		return session;
	},

	async login(credentials: Credentials) {
		const response = await postJson<AuthSessionResponse>('/auth/login', credentials);
		// The API stores emails lowercased (users/domain/value-objects/email.vo.ts), so mirror it here
		session = {
			email: credentials.email.toLowerCase(),
			accessToken: response.accessToken,
			refreshToken: response.refreshToken
		};
		storeSession(session);
	},

	/** Creates the account only – the register endpoint returns the user, not tokens, so callers sign in separately */
	async register(credentials: Credentials) {
		await postJson('/auth/register', credentials);
	},

	/**
	 * Calls a protected endpoint. A 401 means the 15-minute access token ran out: it is renewed once with the
	 * refresh token and the call retried. If the refresh token is refused, the person is signed out and sent to sign in.
	 */
	async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
		const usedToken = session?.accessToken;
		try {
			return await request<T>(method, path, { body, accessToken: usedToken });
		} catch (error) {
			if (!(error instanceof ApiError) || error.status !== HttpStatus.Unauthorized) throw error;
		}
		// A token different from the one just rejected means a parallel call already renewed it: reuse that one
		const renewalRefused =
			session?.accessToken === usedToken &&
			!(await renewSession()) &&
			// Still the same session, so its refresh token was refused; a sign-out or new sign-in meanwhile is left alone
			session?.accessToken === usedToken;
		if (renewalRefused) {
			this.logout();
			await goto(resolve('/(auth)/login'));
		}
		if (!session) throw new ApiError(HttpStatus.Unauthorized, 'Your session ended. Sign in again.');
		return request<T>(method, path, {
			body,
			accessToken: session.accessToken
		});
	},

	logout() {
		const refreshToken = session?.refreshToken;
		session = null;
		storeSession(null);
		// Revoking server-side is best-effort: the local session is already gone either way
		if (refreshToken) void postJson('/auth/logout', { refreshToken }).catch(() => undefined);
	}
};
