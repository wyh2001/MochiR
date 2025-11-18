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
	import { login } from '$lib/api/auth';
	import { ApiError } from '$lib/api/client';
	import { invalidateAuthSession } from '$lib/utils/auth-session';
	import type { components } from '$lib/api/types';

	type LoginDto = components['schemas']['LoginDto'];

	let userNameOrEmail = $state('');
	let password = $state('');
	let isLoading = $state(false);
	let error = $state('');

	const handleLogin = async () => {
		error = '';

		// Basic validation
		if (!userNameOrEmail || !password) {
			error = 'Please fill in all fields';
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters';
			return;
		}

		isLoading = true;

		try {
			const credentials: LoginDto = {
				userNameOrEmail: userNameOrEmail.trim(),
				password
			};

			await login(credentials);

			// Redirect to home after successful login
			await invalidateAuthSession();
			goto('/');
		} catch (err) {
			if (err instanceof ApiError) {
				if (err.status === 401) {
					error = 'Invalid email or password';
				} else if (err.status === 400) {
					error = 'Please check your input';
				} else {
					error = 'Login failed. Please try again.';
				}
			} else {
				error = 'Network error. Please check your connection.';
				console.error('Login error:', err);
			}
		} finally {
			isLoading = false;
		}
	};

	const handleKeyPress = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleLogin();
		}
	};
</script>

<svelte:head>
	<title>Login - MochiR</title>
	<meta name="description" content="Login to your MochiR account" />
</svelte:head>

<div class="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
	<Card class="w-full max-w-md">
		<CardHeader class="space-y-1">
			<CardTitle class="text-2xl font-bold">Login</CardTitle>
			<CardDescription>Enter your email and password to access your account</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if error}
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
					{error}
				</div>
			{/if}

			<div class="space-y-2">
				<Label for="userNameOrEmail">Username or Email</Label>
				<Input
					id="userNameOrEmail"
					type="text"
					placeholder="username or you@example.com"
					bind:value={userNameOrEmail}
					onkeypress={handleKeyPress}
					disabled={isLoading}
					required
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
					autocomplete="current-password"
				/>
			</div>
		</CardContent>
		<CardFooter class="flex flex-col gap-4">
			<Button class="w-full" onclick={handleLogin} disabled={isLoading}>
				{isLoading ? 'Logging in...' : 'Login'}
			</Button>
			<p class="text-center text-sm text-muted-foreground">
				Don't have an account?
				<a
					href="/auth/register"
					class="font-medium underline underline-offset-4 hover:text-primary"
				>
					Sign up
				</a>
			</p>
		</CardFooter>
	</Card>
</div>
