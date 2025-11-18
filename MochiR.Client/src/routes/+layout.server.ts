import type { LayoutServerLoad } from './$types';
import { SELF_PROFILE } from '$lib/api/endpoints';
import { api, ApiError } from '$lib/api/client';
import type { components } from '$lib/api/types';
import { authSessionKey } from '$lib/utils/auth-session';

type SelfProfileDto = components['schemas']['SelfProfileDto'];

export const load: LayoutServerLoad = async ({ fetch, depends }) => {
	depends(authSessionKey);
	try {
		const user = await api.get<SelfProfileDto>(SELF_PROFILE, { fetch });
		return { currentUser: user ?? null };
	} catch (error) {
		if (error instanceof ApiError && error.status === 401) {
			return { currentUser: null };
		}
		console.warn('Failed to load current user in +layout.server', error);
		return { currentUser: null };
	}
};
