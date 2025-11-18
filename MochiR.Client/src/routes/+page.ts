import { getLatestReviews, getFollowingReviews } from '$lib/api/reviews';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	try {
		const latestResponse = await getLatestReviews({ pageSize: 20 }, fetch);
		const followingResponse = await getFollowingReviews();
		return {
			latestReviews: latestResponse.items,
			followingReviews: followingResponse.items,
			totalCount: latestResponse.totalCount
		};
	} catch (e) {
		console.error('Failed to load latest reviews', e);
		throw error(500, 'Could not fetch latest reviews. Please try again later.');
	}
};
