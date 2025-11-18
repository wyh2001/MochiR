<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { createReview } from '$lib/api/reviews';
	import { ApiError } from '$lib/api/client';
	import type { components } from '$lib/api/types';
	import { Star, X } from '@lucide/svelte';

	type CreateReviewDto = components['schemas']['CreateReviewDto'];
	type ReviewRatingDto = components['schemas']['ReviewRatingDto'];

	// Get subjectId from URL
	const subjectId = $derived(() => {
		const id = $page.params.id;
		return id ? parseInt(id, 10) : 0;
	});

	let title = $state('');
	let content = $state('');
	let excerpt = $state('');
	let overallRating = $state(0);
	let tagInput = $state('');
	let tags = $state<string[]>([]);
	let isLoading = $state(false);
	let error = $state('');
	let successMessage = $state('');

	// Auto-generate excerpt from content
	const generateExcerpt = () => {
		if (content && !excerpt) {
			excerpt = content.slice(0, 150);
			if (content.length > 150) {
				excerpt += '...';
			}
		}
	};

	const addTag = () => {
		const tag = tagInput.trim();
		if (tag && !tags.includes(tag) && tags.length < 10) {
			tags = [...tags, tag];
			tagInput = '';
		}
	};

	const removeTag = (tagToRemove: string) => {
		tags = tags.filter((t) => t !== tagToRemove);
	};

	const handleTagKeyPress = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			addTag();
		}
	};

	const setRating = (rating: number) => {
		overallRating = rating;
	};

	const validateForm = (): boolean => {
		if (!title.trim() && !content.trim()) {
			error = 'Please provide at least a title or content for your review';
			return false;
		}

		if (title && (title.length < 3 || title.length > 200)) {
			error = 'Title must be between 3 and 200 characters';
			return false;
		}

		if (content && content.length > 5000) {
			error = 'Content must be less than 5000 characters';
			return false;
		}

		if (overallRating < 0 || overallRating > 5) {
			error = 'Rating must be between 0 and 5';
			return false;
		}

		return true;
	};

	const handleSubmit = async () => {
		error = '';
		successMessage = '';

		if (!validateForm()) {
			return;
		}

		isLoading = true;

		try {
			const ratings: ReviewRatingDto[] =
				overallRating > 0 ? [{ key: 'overall', score: overallRating, label: 'Overall' }] : [];

			const createData: CreateReviewDto = {
				subjectId: subjectId(),
				title: title.trim() || null,
				content: content.trim() || null,
				excerpt: excerpt.trim() || null,
				ratings: ratings.length > 0 ? ratings : null,
				tags: tags.length > 0 ? tags : null
			};

			const result = await createReview(createData);

			successMessage = 'Review created successfully!';

			// Redirect to subject page after success
			setTimeout(() => {
				goto(`/subjects/${subjectId()}`);
			}, 1500);
		} catch (err) {
			if (err instanceof ApiError) {
				if (err.status === 401 || err.status === 403) {
					error = 'Please login to create a review';
				} else if (err.status === 400) {
					const body = err.body as any;
					if (body?.errors) {
						const errorMessages = Object.values(body.errors).flat();
						error = errorMessages.join(', ');
					} else {
						error = 'Invalid review data';
					}
				} else if (err.status === 404) {
					error = 'Subject not found';
				} else {
					error = 'Failed to create review. Please try again.';
				}
			} else {
				error = 'Network error. Please check your connection.';
				console.error('Create review error:', err);
			}
		} finally {
			isLoading = false;
		}
	};
</script>

<svelte:head>
	<title>Create New Review - MochiR</title>
	<meta name="description" content="Write a review for this subject" />
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 py-8">
	<Card>
		<CardHeader>
			<CardTitle class="text-2xl">Create New Review</CardTitle>
			<CardDescription>Share your experience and rate this subject</CardDescription>
		</CardHeader>
		<CardContent class="space-y-6">
			{#if error}
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
					{error}
				</div>
			{/if}

			{#if successMessage}
				<div
					class="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400"
					role="status"
				>
					{successMessage}
				</div>
			{/if}

			<!-- Rating Section -->
			<div class="space-y-2">
				<Label>Overall Rating</Label>
				<div class="flex items-center gap-2">
					{#each [1, 2, 3, 4, 5] as rating}
						<button
							type="button"
							onclick={() => setRating(rating)}
							disabled={isLoading}
							class="transition-transform hover:scale-110 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							aria-label={`Rate ${rating} stars`}
						>
							<Star
								class={overallRating >= rating
									? 'h-8 w-8 fill-yellow-400 text-yellow-400'
									: 'h-8 w-8 text-muted-foreground'}
							/>
						</button>
					{/each}
					{#if overallRating > 0}
						<span class="ml-2 text-sm font-medium">{overallRating}.0</span>
					{/if}
				</div>
			</div>

			<!-- Title -->
			<div class="space-y-2">
				<Label for="title">Title (optional)</Label>
				<Input
					id="title"
					type="text"
					placeholder="e.g., Great framework with amazing performance"
					bind:value={title}
					disabled={isLoading}
					autocomplete="off"
				/>
				<p class="text-xs text-muted-foreground">A short headline for your review</p>
			</div>

			<!-- Content -->
			<div class="space-y-2">
				<Label for="content">Review Content</Label>
				<textarea
					id="content"
					bind:value={content}
					onblur={generateExcerpt}
					disabled={isLoading}
					placeholder="Share your detailed thoughts, experiences, pros and cons..."
					rows="8"
					class="flex min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				></textarea>
				<p class="text-xs text-muted-foreground">
					{content.length} / 5000 characters
				</p>
			</div>

			<!-- Excerpt -->
			<div class="space-y-2">
				<Label for="excerpt">Excerpt (optional)</Label>
				<Input
					id="excerpt"
					type="text"
					placeholder="Short summary for preview..."
					bind:value={excerpt}
					disabled={isLoading}
					autocomplete="off"
				/>
				<p class="text-xs text-muted-foreground">
					Brief summary shown in lists (auto-generated if left empty)
				</p>
			</div>

			<!-- Tags -->
			<div class="space-y-2">
				<Label for="tags">Tags (optional)</Label>
				<div class="flex gap-2">
					<Input
						id="tags"
						type="text"
						placeholder="Add a tag and press Enter"
						bind:value={tagInput}
						onkeypress={handleTagKeyPress}
						disabled={isLoading}
						autocomplete="off"
					/>
					<Button type="button" variant="secondary" onclick={addTag} disabled={isLoading}>
						Add
					</Button>
				</div>
				{#if tags.length > 0}
					<div class="flex flex-wrap gap-2">
						{#each tags as tag}
							<Badge variant="secondary" class="gap-1">
								{tag}
								<button
									type="button"
									onclick={() => removeTag(tag)}
									disabled={isLoading}
									class="ml-1 hover:text-destructive"
									aria-label={`Remove tag ${tag}`}
								>
									<X class="h-3 w-3" />
								</button>
							</Badge>
						{/each}
					</div>
				{/if}
				<p class="text-xs text-muted-foreground">Add relevant tags to categorize your review</p>
			</div>
		</CardContent>
		<CardFooter class="flex gap-2">
			<Button class="flex-1" onclick={handleSubmit} disabled={isLoading}>
				{isLoading ? 'Publishing...' : 'Publish Review'}
			</Button>
			<Button variant="outline" onclick={() => goto('/')} disabled={isLoading}>Cancel</Button>
		</CardFooter>
	</Card>
</div>
