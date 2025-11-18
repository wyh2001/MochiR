import type { components } from './types';
import { api } from './client';
import { REVIEWS_BASE, REVIEWS_LATEST } from './endpoints';

export type ReviewSummaryDto = components['schemas']['ReviewSummaryDto'];
export type CreateReviewDto = components['schemas']['CreateReviewDto'];
export type UpdateReviewDto = components['schemas']['UpdateReviewDto'];
type ReviewSummaryList = components['schemas']['ReviewSummaryDto'][] | null | undefined;
type LatestReviewsPayload = components['schemas']['LatestReviewsPageDto'];
export type LatestReviewsPageDto = NonNullable<LatestReviewsPayload>;

const EMPTY_LATEST_PAGE: LatestReviewsPageDto = {
	totalCount: 0,
	page: 1,
	pageSize: 0,
	items: [],
	nextCursor: null,
	hasMore: false
};

function ensureReviewList(list: ReviewSummaryList): ReviewSummaryDto[] {
	return list ?? [];
}

function normalizeLatestPage(payload: LatestReviewsPayload): LatestReviewsPageDto {
	if (!payload) {
		return { ...EMPTY_LATEST_PAGE };
	}

	return {
		totalCount: payload.totalCount ?? 0,
		page: payload.page ?? 1,
		pageSize: payload.pageSize ?? payload.items?.length ?? 0,
		items: payload.items ?? [],
		nextCursor: payload.nextCursor ?? null,
		hasMore: payload.hasMore ?? false
	};
}

/**
 * Get list of reviews with optional filters
 */
export async function getReviews(
	params?: {
		subjectId?: number;
		userId?: string;
	},
	fetchFn?: typeof fetch
): Promise<ReviewSummaryDto[]> {
	const queryParams = new URLSearchParams();
	if (params?.subjectId) queryParams.append('subjectId', params.subjectId.toString());
	if (params?.userId) queryParams.append('userId', params.userId);
	const query = queryParams.toString();
	const endpoint = query ? `${REVIEWS_BASE}?${query}` : REVIEWS_BASE;
	const list = await api.get<ReviewSummaryDto[]>(endpoint, { auth: false, fetch: fetchFn });
	return ensureReviewList(list);
}

/**
 * Get reviews for a specific subject
 */
export async function getReviewsBySubject(
	subjectId: number,
	_params?: { pageNumber?: number; pageSize?: number },
	fetchFn?: typeof fetch
): Promise<ReviewSummaryDto[]> {
	return await getReviews({ subjectId }, fetchFn);
}

/**
 * Get review details by ID
 */
export async function getReviewById(id: number, fetchFn?: typeof fetch): Promise<ReviewSummaryDto> {
	return (await api.get<ReviewSummaryDto>(`${REVIEWS_BASE}/${id}`, {
		auth: false,
		fetch: fetchFn
	}))!;
}

/**
 * Create a new review
 */
export async function createReview(
	review: CreateReviewDto,
	fetchFn?: typeof fetch
): Promise<ReviewSummaryDto> {
	return (await api.post<ReviewSummaryDto>(REVIEWS_BASE, review, { fetch: fetchFn }))!;
}

/**
 * Update a review (only by author)
 */
export async function updateReview(
	id: number,
	review: UpdateReviewDto,
	fetchFn?: typeof fetch
): Promise<ReviewSummaryDto> {
	return (await api.put<ReviewSummaryDto>(`${REVIEWS_BASE}/${id}`, review, { fetch: fetchFn }))!;
}

/**
 * Delete a review (only by author)
 */
export async function deleteReview(id: number, fetchFn?: typeof fetch): Promise<void> {
	return await api.delete<void>(`${REVIEWS_BASE}/${id}`, { fetch: fetchFn });
}

/**
 * Like a review
 */
export async function likeReview(reviewId: number): Promise<void> {
	// Placeholder: backend like endpoint not defined yet.
	throw new Error('Like review endpoint not implemented on backend.');
}

/**
 * Unlike a review
 */
export async function unlikeReview(reviewId: number): Promise<void> {
	throw new Error('Unlike review endpoint not implemented on backend.');
}

/**
 * Get user's liked reviews
 */
export async function getLikedReviews(userId: string): Promise<ReviewSummaryDto[]> {
	throw new Error('Liked reviews endpoint not implemented on backend.');
}

/**
 * Get latest reviews (for homepage)
 */

export async function getLatestReviews(
	params?: {
		pageNumber?: number;
		pageSize?: number;
		after?: string;
		afterId?: number;
	},
	fetchFn?: typeof fetch
): Promise<LatestReviewsPageDto> {
	const queryParams = new URLSearchParams();
	if (params?.pageNumber) queryParams.append('page', params.pageNumber.toString());
	if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
	if (params?.after) queryParams.append('after', params.after);
	if (params?.afterId) queryParams.append('afterId', params.afterId.toString());
	const query = queryParams.toString();
	const endpoint = query ? `${REVIEWS_LATEST}?${query}` : REVIEWS_LATEST;
	const payload = await api.get<LatestReviewsPayload>(endpoint, { auth: false, fetch: fetchFn });
	return normalizeLatestPage(payload);
}

/**
 * Get reviews from followed users
 */
export async function getFollowingReviews(): Promise<LatestReviewsPageDto> {
	// Backend does not provide following feed yet; return empty structure.
	return { ...EMPTY_LATEST_PAGE };
}
