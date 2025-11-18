import { invalidate } from '$app/navigation';

const AUTH_SESSION_KEY = 'auth:session';

export const invalidateAuthSession = async (): Promise<void> => {
	await invalidate(AUTH_SESSION_KEY);
};

export const authSessionKey = AUTH_SESSION_KEY;
