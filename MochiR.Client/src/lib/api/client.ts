import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

/**
 * API client configuration and utilities
 */
// Use relative base in development (dev proxy handles forwarding). In production set PUBLIC_API_BASE_URL.
export const API_BASE_URL = env.PUBLIC_API_BASE_URL || '';

/**
 * Get authentication token from localStorage
 */
export function getAuthToken(): string | null {
	if (!browser) return null;
	return localStorage.getItem('auth_token');
}

/**
 * Set authentication token in localStorage
 */
export function setAuthToken(token: string): void {
	if (!browser) return;
	localStorage.setItem('auth_token', token);
}

/**
 * Remove authentication token from localStorage
 */
export function clearAuthToken(): void {
	if (!browser) return;
	localStorage.removeItem('auth_token');
}

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
	/** Whether to include authentication token */
	auth?: boolean;
	/** Request body data */
	data?: unknown;
}

/**
 * Make an API request with automatic error handling
 */
export async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
	const { auth = true, data, headers = {}, ...fetchOptions } = options;

	const url = `${API_BASE_URL}${endpoint}`;

	const requestHeaders: Record<string, string> = {
		'Content-Type': 'application/json',
		...(headers as Record<string, string>)
	};

	// Add authorization header if needed
	if (auth) {
		const token = getAuthToken();
		if (token) {
			requestHeaders['Authorization'] = `Bearer ${token}`;
		}
	}

	// Prepare request body
	const requestInit: RequestInit = {
		...fetchOptions,
		headers: requestHeaders
	};

	if (data) {
		requestInit.body = JSON.stringify(data);
	}

	try {
		const response = await fetch(url, requestInit);

		// Handle non-OK responses
		if (!response.ok) {
			let errorBody;
			const contentType = response.headers.get('content-type');

			try {
				if (contentType?.includes('application/json')) {
					errorBody = await response.json();
				} else {
					errorBody = await response.text();
				}
			} catch (parseError) {
				// If parsing fails, use status text
				errorBody = response.statusText;
			}

			throw new ApiError(response.status, response.statusText, errorBody);
		}

		// Handle empty responses (204 No Content)
		if (response.status === 204) {
			return undefined as T;
		}

		// Parse JSON response
		const contentType = response.headers.get('content-type');
		if (contentType?.includes('application/json')) {
			return await response.json();
		}

		// Return text for non-JSON responses
		return (await response.text()) as unknown as T;
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		// Network errors or other fetch errors
		throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
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
