import type { components } from '$lib/api/types';

// Re-export API types for convenience
export type ReviewRating = components['schemas']['ReviewRatingDto'];
export type ReviewDetail = components['schemas']['ReviewDetailDto'];
export type ReviewSummary = components['schemas']['ReviewSummaryDto'];
export type ReviewStatus = components['schemas']['ReviewStatus'];

// Main Review type - use ReviewDetail for full details or ReviewSummary for lists
export type Review = ReviewSummary;
