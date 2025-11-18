import { env } from '$env/dynamic/public';

/**
 * API client configuration and utilities
 */
// Use relative base in development (dev proxy handles forwarding). In production set PUBLIC_API_BASE_URL.
export const API_BASE_URL = env.PUBLIC_API_BASE_URL || '';

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
	constructor(
		public status: number,
		public statusText: string,
		public body?: unknown
	) {
		super(`API Error: ${status} ${statusText}`);
		this.name = 'ApiError';
	}
}

/**
 * Request options for API calls
 */
export interface ApiRequestOptions extends RequestInit {
	/** Request body data */
	data?: unknown;
	/** Injected fetch (use event.fetch in load on server) */
	fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

/**
 * Make an API request with automatic error handling
 */
export async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
	const { data, headers = {}, fetch: injectedFetch, ...fetchOptions } = options;

	const url = `${API_BASE_URL}${endpoint}`;

	const requestHeaders: Record<string, string> = {
		'Content-Type': 'application/json',
		...(headers as Record<string, string>)
	};

	// Prepare request body
	const requestInit: RequestInit = {
		...fetchOptions,
		headers: requestHeaders
	};

	if (data) {
		requestInit.body = JSON.stringify(data);
	}

	try {
		const doFetch = injectedFetch ?? fetch;
		const response = await doFetch(url as unknown as RequestInfo, requestInit);

		// Handle non-OK responses
		if (!response.ok) {
			let errorBody: unknown;
			try {
				// Prefer JSON if possible; avoid reading headers in SSR
				errorBody = await response.clone().json();
			} catch {
				try {
					errorBody = await response.text();
				} catch {
					errorBody = response.statusText;
				}
			}

			throw new ApiError(response.status, response.statusText, errorBody);
		}

		// Handle empty responses (204 No Content)
		if (response.status === 204) {
			return undefined as T;
		}

		const rawBody = await response.text();
		if (!rawBody) {
			return undefined as T;
		}

		let payload: unknown;
		try {
			payload = JSON.parse(rawBody);
		} catch {
			return rawBody as unknown as T;
		}

		if (isApiEnvelope(payload)) {
			if (payload.success === false || payload.error) {
				throw new ApiError(
					response.status,
					payload.error?.message ?? response.statusText,
					payload.error ?? payload
				);
			}

			return payload.data as T;
		}

		return payload as T;
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		// Network errors or other fetch errors
		throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

interface ApiEnvelope<T = unknown> {
	success?: boolean;
	data?: T;
	error?: { message?: string } | null;
}

function isApiEnvelope(payload: unknown): payload is ApiEnvelope {
	return typeof payload === 'object' && payload !== null && 'success' in payload;
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
	get: <T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) =>
		apiRequest<T>(endpoint, { ...options, method: 'GET' }),

	post: <T>(
		endpoint: string,
		data?: unknown,
		options?: Omit<ApiRequestOptions, 'method' | 'data'>
	) => apiRequest<T>(endpoint, { ...options, method: 'POST', data }),

	put: <T>(
		endpoint: string,
		data?: unknown,
		options?: Omit<ApiRequestOptions, 'method' | 'data'>
	) => apiRequest<T>(endpoint, { ...options, method: 'PUT', data }),

	patch: <T>(
		endpoint: string,
		data?: unknown,
		options?: Omit<ApiRequestOptions, 'method' | 'data'>
	) => apiRequest<T>(endpoint, { ...options, method: 'PATCH', data }),

	delete: <T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) =>
		apiRequest<T>(endpoint, { ...options, method: 'DELETE' })
};
