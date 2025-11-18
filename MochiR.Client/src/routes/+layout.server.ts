import type { LayoutServerLoad } from './$types';
import { SELF_PROFILE } from '$lib/api/endpoints';

export const load: LayoutServerLoad = async ({ fetch, depends }) => {
	depends('auth:session');
	try {
		const res = await fetch(SELF_PROFILE, { method: 'GET' });
		if (res.ok) {
			const payload = await res.json();
			const user = payload?.data ?? payload ?? null;
			return { currentUser: user };
		}
	} catch {
		// ignore errors and treat as not authenticated
	}
	return { currentUser: null };
};
