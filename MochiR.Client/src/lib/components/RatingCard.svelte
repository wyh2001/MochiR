<script lang="ts">
	import type { Review } from '$lib/types/rating.js';
	import {
		Item,
		ItemHeader,
		ItemContent,
		ItemTitle,
		ItemDescription
	} from '$lib/components/ui/item/index.js';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Star, Heart } from '@lucide/svelte';
	import { likeReview, unlikeReview } from '$lib/api/reviews';
	import { auth } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';

	let { review, showSubjectName = true }: { review: Review; showSubjectName?: boolean } = $props();

	let localLikeCount = $state(review.likeCount);
	let localIsLiked = $state(review.isLikedByCurrentUser);
	let isTogglingLike = $state(false);

	const getInitials = (name: string | null) => {
		if (!name) return '??';
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	const displayName = review.authorDisplayName || review.authorUserName || 'Anonymous';
	const username = review.authorUserName || 'anonymous';

	// Calculate average rating or get overall rating
	const overallRating = $derived(() => {
		if (!review.ratings || review.ratings.length === 0) return null;

		const overall = review.ratings.find((r) => r.key === 'overall');
		if (overall) return overall.score;

		// If no overall rating, calculate average
		const sum = review.ratings.reduce((acc, r) => acc + r.score, 0);
		return sum / review.ratings.length;
	});

	const handleLikeClick = async (e: MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		// Check if user is authenticated
		if (!auth.isAuthenticated) {
			goto('/auth/login');
			return;
		}

		if (isTogglingLike) return;

		isTogglingLike = true;
		const previousLiked = localIsLiked;
		const previousCount = localLikeCount;

		// Optimistic update
		localIsLiked = !localIsLiked;
		localLikeCount += localIsLiked ? 1 : -1;

		try {
			if (localIsLiked) {
				await likeReview(review.id);
			} else {
				await unlikeReview(review.id);
			}
		} catch (error) {
			// Revert on error
			localIsLiked = previousLiked;
			localLikeCount = previousCount;
			console.error('Failed to toggle like:', error);
		} finally {
			isTogglingLike = false;
		}
	};
</script>

<a href="/subjects/{review.subjectId}" class="block no-underline">
	<Item
		variant="outline"
		class="cursor-pointer flex-col items-start transition-colors hover:bg-accent/30"
	>
		<ItemHeader class="w-full">
			<div class="flex w-full items-center gap-3">
				<Avatar>
					<AvatarImage src={review.authorAvatarUrl} alt={displayName} />
					<AvatarFallback>{getInitials(displayName)}</AvatarFallback>
				</Avatar>
				<div class="min-w-0 flex-1">
					{#if showSubjectName}
						<ItemTitle class="text-base font-semibold">{review.subjectName}</ItemTitle>
					{/if}
					<p class="text-sm text-muted-foreground">@{username}</p>
				</div>
				<div class="flex shrink-0 items-center gap-3">
					{#if overallRating() !== null}
						<div
							class="flex items-center gap-1"
							aria-label={`Rating: ${overallRating()!.toFixed(1)}`}
						>
							<Star class="h-4 w-4 fill-yellow-400 text-yellow-400" />
							<span class="text-sm font-semibold">{overallRating()!.toFixed(1)}</span>
						</div>
					{/if}
					<button
						onclick={handleLikeClick}
						disabled={isTogglingLike}
						class="flex items-center gap-1 transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
						aria-label={localIsLiked ? 'Unlike' : 'Like'}
						type="button"
					>
						<Heart
							class={localIsLiked
								? 'h-4 w-4 fill-red-500 text-red-500'
								: 'h-4 w-4 text-muted-foreground'}
						/>
						<span class="text-sm font-medium">{localLikeCount}</span>
					</button>
				</div>
			</div>
		</ItemHeader>

		<ItemContent class="w-full">
			{#if review.title}
				<h3 class="mb-2 text-sm font-semibold">{review.title}</h3>
			{/if}

			{#if review.excerpt}
				<ItemDescription class="text-sm leading-relaxed whitespace-pre-wrap">
					{review.excerpt}
				</ItemDescription>
			{/if}

			{#if review.tags.length > 0}
				<div class="mt-3 flex flex-wrap gap-2">
					{#each review.tags as tag}
						<Badge variant="secondary" class="text-xs">{tag}</Badge>
					{/each}
				</div>
			{/if}

			<p class="mt-3 text-xs text-muted-foreground">
				{new Date(review.createdAt).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'short',
					day: 'numeric'
				})}
			</p>
		</ItemContent>
	</Item>
</a>
