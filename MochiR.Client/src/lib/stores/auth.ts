import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
export interface AuthState {
	isAuthenticated: boolean;
	user: Record<string, any> | null; // Generic user profile from backend
}

/**
 * Initialize auth state from localStorage
 */
function createAuthStore() {
	const initialState: AuthState = {
		isAuthenticated: false,
		user: null
	};

	if (browser) {
		const userJson = localStorage.getItem('auth_user');
		if (userJson) {
			try {
				const user = JSON.parse(userJson);
				initialState.isAuthenticated = true;
				initialState.user = user;
			} catch (e) {
				console.error('Failed to parse stored user data:', e);
				localStorage.removeItem('auth_user');
			}
		}
	}

	const { subscribe, set, update } = writable<AuthState>(initialState);

	return {
		subscribe,

		/**
		 * Set authenticated user and token
		 */
		setAuth: (user: Record<string, any>) => {
			if (browser) {
				localStorage.setItem('auth_user', JSON.stringify(user));
			}
			set({ isAuthenticated: true, user });
		},

		/**
		 * Clear authentication
		 */
		clearAuth: () => {
			if (browser) {
				localStorage.removeItem('auth_user');
			}
			set({ isAuthenticated: false, user: null });
		},

		/**
		 * Update user information
		 */
		updateUser: (user: Record<string, any>) => {
			update((state) => {
				if (!state.user) return state;
				const updatedUser = { ...state.user, ...user };
				if (browser) {
					localStorage.setItem('auth_user', JSON.stringify(updatedUser));
				}
				return { ...state, user: updatedUser };
			});
		}
	};
}

export const authStore = createAuthStore();

/**
 * Derived store for checking if user is authenticated
 */
export const isAuthenticated = derived(authStore, ($auth) => $auth.isAuthenticated);

/**
 * Derived store for current user
 */
export const currentUser = derived(authStore, ($auth) => $auth.user);
