import { browser } from '$app/environment';
import type { components } from '$lib/api/types';

const STORAGE_KEY = 'auth_user';

type SelfProfile = components['schemas']['SelfProfileDto'];
type AuthUser = Exclude<SelfProfile, null>;

type PascalCaseAuthUser = {
	Id: string;
	UserName: string | null;
	DisplayName: string | null;
	Email: string | null;
	EmailConfirmed: boolean;
	PhoneNumber: string | null;
	PhoneNumberConfirmed: boolean;
	AvatarUrl: string | null;
	TwoFactorEnabled: boolean;
	LockoutEnabled: boolean;
	LockoutEnd: string | null;
	CreatedAtUtc: string;
	FollowersCount: number;
	FollowingCount: number;
};

function isCamelCaseUser(user: unknown): user is AuthUser {
	return typeof user === 'object' && user !== null && 'id' in user;
}

function normalizeAuthUser(user: AuthUser | PascalCaseAuthUser): AuthUser {
	if (isCamelCaseUser(user)) {
		const value = user;
		return {
			...value,
			userName: value.userName ?? null,
			displayName: value.displayName ?? null,
			email: value.email ?? null,
			phoneNumber: value.phoneNumber ?? null,
			avatarUrl: value.avatarUrl ?? null,
			lockoutEnd: value.lockoutEnd ?? null
		};
	}

	const pascal = user as PascalCaseAuthUser;
	return {
		id: pascal.Id,
		userName: pascal.UserName ?? null,
		displayName: pascal.DisplayName ?? null,
		email: pascal.Email ?? null,
		emailConfirmed: pascal.EmailConfirmed ?? false,
		phoneNumber: pascal.PhoneNumber ?? null,
		phoneNumberConfirmed: pascal.PhoneNumberConfirmed ?? false,
		avatarUrl: pascal.AvatarUrl ?? null,
		twoFactorEnabled: pascal.TwoFactorEnabled ?? false,
		lockoutEnabled: pascal.LockoutEnabled ?? false,
		lockoutEnd: pascal.LockoutEnd ?? null,
		createdAtUtc: pascal.CreatedAtUtc ?? '',
		followersCount: pascal.FollowersCount ?? 0,
		followingCount: pascal.FollowingCount ?? 0
	};
}

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
		const parsed = JSON.parse(raw) as AuthUser | PascalCaseAuthUser;
		return normalizeAuthUser(parsed);
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
		setAuth(newUser: AuthUser | PascalCaseAuthUser) {
			const normalized = normalizeAuthUser(newUser);
			user = normalized;
			persistUser(normalized);
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
