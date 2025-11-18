<script lang="ts">
	import RatingCard from '$lib/components/RatingCard.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Search, Plus } from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { components } from '$lib/api/types';

	type ReviewSummaryDto = components['schemas']['ReviewSummaryDto'];
	type TabType = 'latest' | 'following';

	let { data }: { data: PageData } = $props();
	const isAuthed = $derived.by(() => Boolean(data.currentUser));

	// State
	let searchQuery = $state('');
	let activeTab = $state<TabType>('latest');

	// Get reviews from loaded data
	const allLatestReviews = $derived(data.latestReviews || []);
	const allFollowingReviews = $derived(data.followingReviews || []);

	// Filter reviews based on active tab and search query
	const filteredReviews = $derived.by(() => {
		let reviews: ReviewSummaryDto[] =
			activeTab === 'latest' ? allLatestReviews : allFollowingReviews;

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			reviews = reviews.filter(
				(review) =>
					review.subjectName?.toLowerCase().includes(query) ||
					review.authorUserName?.toLowerCase().includes(query) ||
					review.authorDisplayName?.toLowerCase().includes(query) ||
					review.title?.toLowerCase().includes(query) ||
					review.excerpt?.toLowerCase().includes(query) ||
					review.tags.some((tag) => tag.toLowerCase().includes(query))
			);
		}

		return reviews;
	});
</script>

<svelte:head>
	<title>MochiR Demo App</title>
	<meta name="description" content="Rating open source projects" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<header class="mb-8 text-center">
		<h1 class="mb-2 text-4xl font-bold">MochiR Demo App</h1>
		<p class="text-muted-foreground">Rating open source projects</p>
	</header>

	<div class="search-container">
		<div class="search-wrapper">
			<Search class="search-icon" size={20} />
			<Input
				type="text"
				placeholder="Search projects, authors, tags..."
				bind:value={searchQuery}
				class="search-input"
			/>
		</div>
	</div>

	<div class="tabs-container" role="tablist" aria-label="Rating feed tabs">
		<button
			class="tab"
			class:active={activeTab === 'latest'}
			onclick={() => (activeTab = 'latest')}
			role="tab"
			aria-selected={activeTab === 'latest'}
			aria-controls="ratings-panel"
			id="latest-tab"
		>
			Latest
		</button>
		{#if isAuthed}
			<button
				class="tab"
				class:active={activeTab === 'following'}
				onclick={() => (activeTab = 'following')}
				role="tab"
				aria-selected={activeTab === 'following'}
				aria-controls="ratings-panel"
				id="following-tab"
			>
				Following
			</button>
		{/if}
	</div>

	<div
		class="ratings-list"
		role="tabpanel"
		id="ratings-panel"
		aria-labelledby={activeTab === 'latest' ? 'latest-tab' : 'following-tab'}
	>
		{#if filteredReviews.length === 0}
			<div class="empty-state">
				<p class="mb-4 text-muted-foreground">
					{#if searchQuery}
						No results found for "{searchQuery}"
					{:else if activeTab === 'following'}
						You're not following anyone yet.
					{:else}
						No reviews available.
					{/if}
				</p>
				{#if searchQuery}
					<p class="mb-4 text-sm text-muted-foreground">Can't find what you're looking for?</p>
					<Button href="/subjects/new" variant="outline" class="gap-2">
						<Plus class="h-4 w-4" />
						Request to Add New Subject
					</Button>
				{/if}
			</div>
		{:else}
			{#each filteredReviews as review (review.id)}
				<RatingCard {review} isAuthenticated={isAuthed} />
			{/each}
		{/if}
	</div>
</div>

<style>
	.search-container {
		max-width: 600px;
		margin: 0 auto 1.5rem;
	}

	.search-wrapper {
		position: relative;
	}

	.search-wrapper :global(.search-icon) {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: hsl(var(--muted-foreground));
		pointer-events: none;
	}

	.search-wrapper :global(.search-input) {
		padding-left: 2.5rem;
	}

	.tabs-container {
		max-width: 600px;
		margin: 0 auto 1rem;
		display: flex;
		border-bottom: 1px solid hsl(var(--border));
	}

	.tab {
		flex: 1;
		padding: 0.75rem 1rem;
		font-weight: 500;
		color: hsl(var(--muted-foreground));
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		transition: all 0.2s;
		position: relative;
	}

	.tab:hover {
		background: hsl(var(--accent));
	}

	.tab:focus-visible {
		outline: 2px solid hsl(var(--ring));
		outline-offset: -2px;
		z-index: 1;
	}

	.tab.active {
		color: hsl(var(--foreground));
		border-bottom-color: hsl(var(--primary));
	}

	.ratings-list {
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
	}
</style>
