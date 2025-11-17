import { getLatestReviews, getFollowingReviews } from '$lib/api/reviews';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const latestResponse = await getLatestReviews({ pageSize: 50 }, fetch);
		// Following feed not implemented on backend; returns empty.
		const followingResponse = await getFollowingReviews();
		return {
			latestReviews: latestResponse.items,
			followingReviews: followingResponse.items,
			totalCount: latestResponse.totalCount
		};
	} catch (e) {
		console.error('Failed to load latest reviews', e);
		return { latestReviews: [], followingReviews: [], totalCount: 0 };
	}
};
