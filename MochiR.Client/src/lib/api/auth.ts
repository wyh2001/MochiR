import { api } from './client';
import { authStore } from '$lib/stores/auth';
import { AUTH_LOGIN, AUTH_REGISTER, AUTH_LOGOUT, SELF_PROFILE } from './endpoints';

// Minimal credential types (English comments) - adapt to backend C# DTOs
export interface LoginCredentials {
	userNameOrEmail: string;
	password: string;
}

export interface RegisterData {
	userName: string;
	email: string;
	password: string;
}

// Backend login response (PascalCase from .NET). Keep flexible key access.
interface BackendLoginResponse {
	SignedIn: boolean;
}
interface BackendRegisterResponse {
	UserId?: string;
	UserName?: string;
	Email?: string;
}

export async function login(credentials: LoginCredentials): Promise<boolean> {
	const resp = await api.post<BackendLoginResponse>(AUTH_LOGIN, credentials, { auth: false });
	if (resp && (resp as any).SignedIn === true) {
		// Fetch current user profile after successful sign-in.
		await tryLoadCurrentUser();
		return true;
	}
	return false;
}

export async function register(data: RegisterData): Promise<boolean> {
	// Register then login using same credentials.
	await api.post<BackendRegisterResponse>(AUTH_REGISTER, data, { auth: false });
	return await login({ userNameOrEmail: data.userName, password: data.password });
}

export async function logout(): Promise<void> {
	try {
		await api.post(AUTH_LOGOUT, null);
	} catch (e) {
		// Non-critical: backend may respond with an error if already logged out.
		console.warn('Logout endpoint returned error', e);
	} finally {
		authStore.clearAuth();
	}
}

export async function getCurrentUser() {
	// Self profile shape from backend SelfProfileDto; use index signature for flexibility.
	return await api.get<Record<string, any>>(SELF_PROFILE);
}

export async function tryLoadCurrentUser(): Promise<void> {
	try {
		const user = await getCurrentUser();
		authStore.setAuth(user); // Cookie mode: no token.
	} catch (e: any) {
		// 401 means not signed in; silently ignore.
		if (e?.status !== 401) {
			console.warn('Failed to load current user', e);
		}
	}
}
