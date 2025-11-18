import type { components } from './types';
import { api, ApiError } from './client';
import { auth, type AuthUser } from '$lib/stores/auth.svelte';
import { AUTH_LOGIN, AUTH_REGISTER, AUTH_LOGOUT, SELF_PROFILE } from './endpoints';

type LoginDto = components['schemas']['LoginDto'];
type RegisterDto = components['schemas']['RegisterDto'];
type LoginResponseDto = components['schemas']['LoginResponseDto'];
type RegisterResponseDto = components['schemas']['RegisterResponseDto'];
type SelfProfileDto = components['schemas']['SelfProfileDto'];

const isAuthUser = (value: SelfProfileDto): value is AuthUser => value !== null;

export async function login(credentials: LoginDto): Promise<boolean> {
	const resp = await api.post<LoginResponseDto>(AUTH_LOGIN, credentials, { auth: false });
	if (resp?.signedIn) {
		await tryLoadCurrentUser();
		return true;
	}
	return false;
}

export async function register(data: RegisterDto): Promise<boolean> {
	await api.post<RegisterResponseDto>(AUTH_REGISTER, data, { auth: false });
	return await login({ userNameOrEmail: data.userName, password: data.password });
}

export async function logout(): Promise<void> {
	try {
		await api.post(AUTH_LOGOUT, null);
	} catch (error) {
		if (!(error instanceof ApiError) || error.status !== 401) {
			console.warn('Logout endpoint returned error', error);
		}
	} finally {
		auth.clearAuth();
	}
}

export async function getCurrentUser(fetchFn?: typeof fetch): Promise<SelfProfileDto> {
	return await api.get<SelfProfileDto>(SELF_PROFILE, { fetch: fetchFn });
}

export async function tryLoadCurrentUser(fetchFn?: typeof fetch): Promise<void> {
	try {
		const user = await getCurrentUser(fetchFn);
		if (isAuthUser(user)) {
			auth.setAuth(user);
		} else {
			auth.clearAuth();
		}
	} catch (error) {
		if (error instanceof ApiError && error.status === 401) {
			auth.clearAuth();
			return;
		}
		console.warn('Failed to load current user', error);
	}
}
