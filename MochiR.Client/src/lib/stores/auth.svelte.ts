import { browser } from '$app/environment';
import type { components } from '$lib/api/types';

const STORAGE_KEY = 'auth_user';

type SelfProfile = components['schemas']['SelfProfileDto'];
type AuthUser = Exclude<SelfProfile, null>;

type PersistedUser = AuthUser | null;

function loadStoredUser(): PersistedUser {
	if (!browser) {
		return null;
	}

	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) {
		return null;
	}

	try {
		return JSON.parse(raw) as AuthUser;
	} catch (error) {
		console.warn('Failed to parse stored auth user', error);
		localStorage.removeItem(STORAGE_KEY);
		return null;
	}
}

function persistUser(user: PersistedUser): void {
	if (!browser) {
		return;
	}

	if (user) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
	} else {
		localStorage.removeItem(STORAGE_KEY);
	}
}

function createAuthStore() {
	let user = $state<PersistedUser>(loadStoredUser());
	let isAuthenticated = $derived(!!user);

	return {
		get user() {
			return user;
		},
		get isAuthenticated() {
			return isAuthenticated;
		},
		setAuth(newUser: AuthUser) {
			user = newUser;
			persistUser(newUser);
		},
		clearAuth() {
			user = null;
			persistUser(null);
		},
		updateUser(update: Partial<AuthUser>) {
			if (!user) {
				return;
			}

			user = { ...user, ...update };
			persistUser(user);
		}
	};
}

export const auth = createAuthStore();
export type { AuthUser };
