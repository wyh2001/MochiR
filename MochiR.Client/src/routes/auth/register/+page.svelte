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
	import { register } from '$lib/api/auth';
	import { ApiError } from '$lib/api/client';
	import type { components } from '$lib/api/types';

	type RegisterDto = components['schemas']['RegisterDto'];

	let username = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isLoading = $state(false);
	let error = $state('');

	const validateEmail = (email: string) => {
		const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return re.test(email);
	};

	const validateUsername = (username: string) => {
		// Username: 3-20 characters, alphanumeric and underscores only
		const re = /^[a-zA-Z0-9_]{3,20}$/;
		return re.test(username);
	};

	const handleRegister = async () => {
		error = '';

		// Validation
		if (!username || !email || !password || !confirmPassword) {
			error = 'Please fill in all fields';
			return;
		}

		if (!validateUsername(username)) {
			error = 'Username must be 3-20 characters (letters, numbers, underscores only)';
			return;
		}

		if (!validateEmail(email)) {
			error = 'Please enter a valid email address';
			return;
		}

		if (password.length < 8) {
			error = 'Password must be at least 8 characters';
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		isLoading = true;

		try {
			const userData: RegisterDto = {
				userName: username,
				email,
				password
			};

			await register(userData);

			// Redirect to home after successful registration
			goto('/');
		} catch (err) {
			if (err instanceof ApiError) {
				if (err.status === 400) {
					// Try to extract specific error message from response
					const body = err.body as any;
					if (body?.error?.message) {
						error = body.error.message;
					} else if (body?.errors) {
						const errorMessages = Object.values(body.errors).flat();
						error = errorMessages.join(', ');
					} else if (body?.message) {
						error = body.message;
					} else {
						error = 'Invalid registration data';
					}
				} else if (err.status === 409) {
					error = 'Username or email already exists';
				} else {
					error = 'Registration failed. Please try again.';
				}
			} else {
				error = 'Network error. Please check your connection.';
				console.error('Registration error:', err);
			}
		} finally {
			isLoading = false;
		}
	};

	const handleKeyPress = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleRegister();
		}
	};
</script>

<svelte:head>
	<title>Sign Up - MochiR</title>
	<meta name="description" content="Create a new MochiR account" />
</svelte:head>

<div class="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
	<Card class="w-full max-w-md">
		<CardHeader class="space-y-1">
			<CardTitle class="text-2xl font-bold">Create an account</CardTitle>
			<CardDescription>Enter your information to get started with MochiR</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if error}
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
					{error}
				</div>
			{/if}

			<div class="space-y-2">
				<Label for="username">Username</Label>
				<Input
					id="username"
					type="text"
					placeholder="johndoe"
					bind:value={username}
					onkeypress={handleKeyPress}
					disabled={isLoading}
					autocomplete="username"
				/>
			</div>

			<div class="space-y-2">
				<Label for="email">Email</Label>
				<Input
					id="email"
					type="email"
					placeholder="you@example.com"
					bind:value={email}
					onkeypress={handleKeyPress}
					disabled={isLoading}
					autocomplete="email"
				/>
			</div>

			<div class="space-y-2">
				<Label for="password">Password</Label>
				<Input
					id="password"
					type="password"
					placeholder="••••••••"
					bind:value={password}
					onkeypress={handleKeyPress}
					disabled={isLoading}
					autocomplete="new-password"
				/>
				<p class="text-xs text-muted-foreground">At least 8 characters</p>
			</div>

			<div class="space-y-2">
				<Label for="confirmPassword">Confirm Password</Label>
				<Input
					id="confirmPassword"
					type="password"
					placeholder="••••••••"
					bind:value={confirmPassword}
					onkeypress={handleKeyPress}
					disabled={isLoading}
					autocomplete="new-password"
				/>
			</div>
		</CardContent>
		<CardFooter class="flex flex-col gap-4">
			<Button class="w-full" onclick={handleRegister} disabled={isLoading}>
				{isLoading ? 'Creating account...' : 'Create account'}
			</Button>
			<p class="text-center text-sm text-muted-foreground">
				Already have an account?
				<a href="/auth/login" class="font-medium underline underline-offset-4 hover:text-primary">
					Sign in
				</a>
			</p>
		</CardFooter>
	</Card>
</div>
