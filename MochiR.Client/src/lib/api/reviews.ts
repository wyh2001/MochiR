import { api } from './client';
import { REVIEWS_BASE, REVIEWS_LATEST } from './endpoints';

// Local review summary type (align with backend ReviewSummaryDto)
export interface ReviewSummaryDto {
	id: number;
	subjectId: number;
	userId: string;
	title?: string | null;
	content?: string | null;
	status: string | number; // Backend enum numeric or string
	createdAt: string | Date;
}

export interface CreateReviewDto {
	subjectId: number;
	title?: string | null;
	content?: string | null;
	ratings?: { key: string; score: number; label?: string | null }[];
}

export interface UpdateReviewDto {
	title: string;
	content?: string | null;
	ratings?: { key: string; score: number; label?: string | null }[];
}

export interface PaginatedResponse<T> {
	items: T[];
	totalCount: number;
	pageNumber: number;
	pageSize: number;
	totalPages: number;
	hasMore?: boolean;
	nextCursor?: any;
}

/**
 * Get list of reviews with optional filters
 */
export async function getReviews(params?: {
	subjectId?: number;
	userId?: string;
}): Promise<PaginatedResponse<ReviewSummaryDto>> {
	const queryParams = new URLSearchParams();
	if (params?.subjectId) queryParams.append('subjectId', params.subjectId.toString());
	if (params?.userId) queryParams.append('userId', params.userId);
	const query = queryParams.toString();
	const endpoint = query ? `${REVIEWS_BASE}?${query}` : REVIEWS_BASE;
	const arr = await api.get<ReviewSummaryDto[]>(endpoint, { auth: false });
	return {
		items: arr,
		totalCount: arr.length,
		pageNumber: 1,
		pageSize: arr.length,
		totalPages: 1
	};
}

/**
 * Get reviews for a specific subject
 */
export async function getReviewsBySubject(
	subjectId: number
): Promise<PaginatedResponse<ReviewSummaryDto>> {
	return await getReviews({ subjectId });
}

/**
 * Get review details by ID
 */
export async function getReviewById(id: number): Promise<ReviewSummaryDto> {
	return await api.get<ReviewSummaryDto>(`${REVIEWS_BASE}/${id}`, { auth: false });
}

/**
 * Create a new review
 */
export async function createReview(review: CreateReviewDto): Promise<ReviewSummaryDto> {
	return await api.post<ReviewSummaryDto>(REVIEWS_BASE, review);
}

/**
 * Update a review (only by author)
 */
export async function updateReview(id: number, review: UpdateReviewDto): Promise<ReviewSummaryDto> {
	return await api.put<ReviewSummaryDto>(`${REVIEWS_BASE}/${id}`, review);
}

/**
 * Delete a review (only by author)
 */
export async function deleteReview(id: number): Promise<void> {
	return await api.delete<void>(`${REVIEWS_BASE}/${id}`);
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
export async function getLatestReviews(params?: {
	pageNumber?: number;
	pageSize?: number;
}): Promise<PaginatedResponse<ReviewSummaryDto>> {
	const queryParams = new URLSearchParams();
	if (params?.pageNumber) queryParams.append('page', params.pageNumber.toString());
	if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
	const query = queryParams.toString();
	const endpoint = query ? `${REVIEWS_LATEST}?${query}` : REVIEWS_LATEST;
	const raw = await api.get<Record<string, any>>(endpoint, { auth: false });
	// Map backend LatestReviewsPageDto to PaginatedResponse
	const items: ReviewSummaryDto[] = (raw.Items || raw.items || []).map((r: any) => ({
		id: r.Id ?? r.id,
		subjectId: r.SubjectId ?? r.subjectId,
		userId: r.UserId ?? r.userId,
		title: r.Title ?? r.title,
		content: r.Content ?? r.content,
		status: r.Status ?? r.status,
		createdAt: r.CreatedAt ?? r.createdAt
	}));
	const totalCount = raw.TotalCount ?? raw.totalCount ?? items.length;
	const pageSize = raw.PageSize ?? raw.pageSize ?? items.length;
	const pageNumber = raw.Page ?? raw.page ?? 1;
	return {
		items,
		totalCount,
		pageNumber,
		pageSize,
		totalPages: pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1,
		hasMore: raw.HasMore ?? raw.hasMore ?? false,
		nextCursor: raw.NextCursor ?? raw.nextCursor
	};
}

/**
 * Get reviews from followed users
 */
export async function getFollowingReviews(): Promise<PaginatedResponse<ReviewSummaryDto>> {
	// Backend does not provide following feed yet; return empty structure.
	return {
		items: [],
		totalCount: 0,
		pageNumber: 1,
		pageSize: 0,
		totalPages: 0
	};
}
