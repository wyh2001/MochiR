import { getSubjectById } from '$lib/api/subjects';
import { getReviewsBySubject } from '$lib/api/reviews';
import { error } from '@sveltejs/kit';
import { ApiError } from '$lib/api/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const subjectId = parseInt(params.id, 10);

	if (isNaN(subjectId)) {
		throw error(400, 'Invalid subject ID');
	}

	try {
		// Load subject details and reviews in parallel
		const [subject, reviews] = await Promise.all([
			getSubjectById(subjectId, fetch),
			getReviewsBySubject(subjectId, { pageNumber: 1, pageSize: 100 }, fetch).catch((err) => {
				if (err instanceof ApiError && err.status === 404) {
					return [];
				}
				throw err;
			})
		]);

		if (!subject) {
			throw error(404, 'Subject not found');
		}

		return {
			subject,
			reviews,
			totalReviews: reviews.length
		};
	} catch (err: any) {
		if (err instanceof ApiError && err.status === 404) {
			throw error(404, 'Subject not found');
		}
		console.error('Failed to load subject:', err);
		throw error(500, 'Failed to load subject data');
	}
};
