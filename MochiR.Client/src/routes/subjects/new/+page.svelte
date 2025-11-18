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
	import { goto } from '$app/navigation';
	import { createSubject } from '$lib/api/subjects';
	import { ApiError } from '$lib/api/client';
	import type { components } from '$lib/api/types';

	type CreateSubjectDto = components['schemas']['CreateSubjectDto'];

	let name = $state('');
	let slug = $state('');
	let subjectTypeId = $state(1); // Default to first type
	let isLoading = $state(false);
	let error = $state('');
	let successMessage = $state('');

	// Auto-generate slug from name
	const generateSlug = () => {
		slug = name
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-');
	};

	const validateForm = (): boolean => {
		if (!name.trim()) {
			error = 'Please enter a subject name';
			return false;
		}

		if (name.length < 2 || name.length > 100) {
			error = 'Subject name must be between 2 and 100 characters';
			return false;
		}

		if (!slug.trim()) {
			error = 'Please enter a slug';
			return false;
		}

		if (!/^[a-z0-9-]+$/.test(slug)) {
			error = 'Slug can only contain lowercase letters, numbers, and hyphens';
			return false;
		}

		if (!subjectTypeId) {
			error = 'Please select a subject type';
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
			const createData: CreateSubjectDto = {
				name: name.trim(),
				slug: slug.trim(),
				subjectTypeId,
				attributes: null
			};

			const result = await createSubject(createData);

			successMessage = 'Subject request submitted successfully!';

			// Redirect to the new subject page after success
			setTimeout(() => {
				if (result.id) {
					goto(`/subjects/${result.id}`);
				} else {
					goto('/');
				}
			}, 1500);
		} catch (err) {
			if (err instanceof ApiError) {
				if (err.status === 401 || err.status === 403) {
					error = 'Please login to create a subject request';
				} else if (err.status === 400) {
					const body = err.body as any;
					if (body?.errors) {
						const errorMessages = Object.values(body.errors).flat();
						error = errorMessages.join(', ');
					} else {
						error = 'Invalid subject data';
					}
				} else if (err.status === 409) {
					error = 'A subject with this slug already exists';
				} else {
					error = 'Failed to create subject. Please try again.';
				}
			} else {
				error = 'Network error. Please check your connection.';
				console.error('Create subject error:', err);
			}
		} finally {
			isLoading = false;
		}
	};

	const handleKeyPress = (e: KeyboardEvent) => {
		if (e.key === 'Enter' && !isLoading) {
			handleSubmit();
		}
	};
</script>

<svelte:head>
	<title>Request New Subject - MochiR</title>
	<meta name="description" content="Request a new subject to be added for review" />
</svelte:head>

<div class="container mx-auto max-w-2xl px-4 py-8">
	<Card>
		<CardHeader>
			<CardTitle class="text-2xl">Request New Subject</CardTitle>
			<CardDescription>
				Submit a request to add a new subject (project, library, tool, etc.) for the community to
				review.
				<br />
				<span class="mt-1 block text-xs text-muted-foreground">
					Note: Requests will be reviewed by administrators before being added.
				</span>
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
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

			<div class="space-y-2">
				<Label for="name">Subject Name *</Label>
				<Input
					id="name"
					type="text"
					placeholder="e.g., Svelte 5 Framework"
					bind:value={name}
					oninput={generateSlug}
					onkeypress={handleKeyPress}
					disabled={isLoading}
					autocomplete="off"
				/>
				<p class="text-xs text-muted-foreground">The display name of the subject</p>
			</div>

			<div class="space-y-2">
				<Label for="slug">Slug *</Label>
				<Input
					id="slug"
					type="text"
					placeholder="e.g., svelte-5-framework"
					bind:value={slug}
					onkeypress={handleKeyPress}
					disabled={isLoading}
					autocomplete="off"
				/>
				<p class="text-xs text-muted-foreground">
					URL-friendly identifier (lowercase, numbers, hyphens only)
				</p>
			</div>

			<div class="space-y-2">
				<Label for="subjectType">Subject Type *</Label>
				<select
					id="subjectType"
					bind:value={subjectTypeId}
					disabled={isLoading}
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					<option value={1}>Framework</option>
					<option value={2}>Library</option>
					<option value={3}>Tool</option>
					<option value={4}>Language</option>
					<option value={5}>Database</option>
					<option value={6}>Other</option>
				</select>
				<p class="text-xs text-muted-foreground">The category of this subject</p>
			</div>
		</CardContent>
		<CardFooter class="flex gap-2">
			<Button class="flex-1" onclick={handleSubmit} disabled={isLoading}>
				{isLoading ? 'Submitting Request...' : 'Submit Request'}
			</Button>
			<Button variant="outline" onclick={() => goto('/')} disabled={isLoading}>Cancel</Button>
		</CardFooter>
	</Card>
</div>
