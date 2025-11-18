<script lang="ts">
	import RatingCard from '$lib/components/RatingCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { PenLine, Star } from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { ReviewSummaryDto } from '$lib/api/reviews';

	let { data }: { data: PageData } = $props();

	// Get subject and reviews from loaded data
	const subject = $derived(data.subject);
	const subjectReviews = $derived(() => (data.reviews ?? []) as ReviewSummaryDto[]);

	// Calculate average rating
	const averageRating = $derived(() => {
		const reviews = subjectReviews();
		if (reviews.length === 0) return null;

		const validRatings = reviews
			.map((r) => {
				if (!r.ratings || r.ratings.length === 0) return null;
				const overall = r.ratings.find((rating) => rating.key === 'overall');
				return overall ? overall.score : null;
			})
			.filter((score): score is number => score !== null);

		if (validRatings.length === 0) return null;

		const sum = validRatings.reduce((acc, score) => acc + score, 0);
		return sum / validRatings.length;
	});
</script>

<svelte:head>
	<title>{subject?.name || 'Subject'} - Reviews - MochiR</title>
	<meta name="description" content={`Read reviews for ${subject?.name || 'this subject'}`} />
</svelte:head>

<div class="container mx-auto max-w-4xl space-y-6 px-4 py-8">
	{#if !subject}
		<Card>
			<CardContent class="py-8 text-center">
				<p class="text-muted-foreground">Subject not found</p>
			</CardContent>
		</Card>
	{:else}
		<!-- Subject Header -->
		<Card>
			<CardHeader>
				<div class="flex items-start justify-between gap-4">
					<div class="flex-1">
						<CardTitle class="mb-2 text-3xl">{subject.name}</CardTitle>
						<CardDescription class="flex items-center gap-4 text-base">
							<span
								>{subjectReviews().length}
								{subjectReviews().length === 1 ? 'Review' : 'Reviews'}</span
							>
							{#if averageRating() !== null}
								<span class="flex items-center gap-1">
									<Star class="h-4 w-4 fill-yellow-400 text-yellow-400" />
									<span class="font-semibold">{averageRating()!.toFixed(1)}</span>
									<span class="text-muted-foreground">Average</span>
								</span>
							{/if}
						</CardDescription>
					</div>
					<Button href={`/subjects/${subject.id}/reviews/new`} class="gap-2">
						<PenLine class="h-4 w-4" />
						Write a Review
					</Button>
				</div>
			</CardHeader>
		</Card>

		<!-- Reviews List -->
		<div class="space-y-4">
			<h2 class="text-xl font-semibold">All Reviews</h2>
			{#if subjectReviews().length === 0}
				<Card>
					<CardContent class="py-8 text-center">
						<p class="mb-4 text-muted-foreground">No reviews yet. Be the first to review!</p>
						<Button href={`/subjects/${subject.id}/reviews/new`} class="gap-2">
							<PenLine class="h-4 w-4" />
							Write the First Review
						</Button>
					</CardContent>
				</Card>
			{:else}
				<div class="space-y-3">
					{#each subjectReviews() as review (review.id)}
						<RatingCard {review} showSubjectName={false} />
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
