<script lang="ts">
	import { page } from '$app/state';
	import { goto, invalidate } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import { logout } from '$lib/api/auth';
	import logo from '$lib/images/svelte-logo.svg';
	import github from '$lib/images/github.svg';

	let isLoggingOut = $state(false);
	const authUser = $derived.by(() => auth.user);
	const isAuthed = $derived.by(() => auth.isAuthenticated);

	const handleLogout = async () => {
		if (isLoggingOut) return;

		isLoggingOut = true;
		try {
			await logout();
			await invalidate('auth:session');
			goto('/');
		} catch (error) {
			console.error('Logout failed:', error);
		} finally {
			isLoggingOut = false;
		}
	};
</script>

<header>
	<div class="corner">
		<a href="https://svelte.dev/docs/kit">
			<img src={logo} alt="SvelteKit" />
		</a>
	</div>

	<nav>
		<svg viewBox="0 0 2 3" aria-hidden="true">
			<path d="M0,0 L1,2 C1.5,3 1.5,3 2,3 L2,0 Z" />
		</svg>
		<ul>
			<li aria-current={page.url.pathname === '/' ? 'page' : undefined}>
				<a href="/">Home</a>
			</li>
			<li aria-current={page.url.pathname === '/about' ? 'page' : undefined}>
				<a href="/about">About</a>
			</li>
			<li aria-current={page.url.pathname.startsWith('/sverdle') ? 'page' : undefined}>
				<a href="/sverdle">Sverdle</a>
			</li>
			{#if isAuthed}
				<li class="user-info">
					<span class="text-muted">
						@{authUser?.displayName ?? authUser?.userName ?? authUser?.email ?? 'User'}
					</span>
				</li>
				<li>
					<button onclick={handleLogout} disabled={isLoggingOut} class="logout-button">
						{isLoggingOut ? 'Logging out...' : 'Logout'}
					</button>
				</li>
			{:else}
				<li aria-current={page.url.pathname === '/auth/login' ? 'page' : undefined}>
					<a href="/auth/login">Login</a>
				</li>
				<li aria-current={page.url.pathname === '/auth/register' ? 'page' : undefined}>
					<a href="/auth/register">Sign Up</a>
				</li>
			{/if}
		</ul>
		<svg viewBox="0 0 2 3" aria-hidden="true">
			<path d="M0,0 L0,3 C0.5,3 0.5,3 1,2 L2,0 Z" />
		</svg>
	</nav>

	<div class="corner">
		<a href="https://github.com/sveltejs/kit">
			<img src={github} alt="GitHub" />
		</a>
	</div>
</header>

<style>
	header {
		display: flex;
		justify-content: space-between;
	}

	.corner {
		width: 3em;
		height: 3em;
	}

	.corner a {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.corner img {
		width: 2em;
		height: 2em;
		object-fit: contain;
	}

	nav {
		display: flex;
		justify-content: center;
		--background: rgba(255, 255, 255, 0.7);
	}

	svg {
		width: 2em;
		height: 3em;
		display: block;
	}

	path {
		fill: var(--background);
	}

	ul {
		position: relative;
		padding: 0;
		margin: 0;
		height: 3em;
		display: flex;
		justify-content: center;
		align-items: center;
		list-style: none;
		background: var(--background);
		background-size: contain;
	}

	li {
		position: relative;
		height: 100%;
	}

	li[aria-current='page']::before {
		--size: 6px;
		content: '';
		width: 0;
		height: 0;
		position: absolute;
		top: 0;
		left: calc(50% - var(--size));
		border: var(--size) solid transparent;
		border-top: var(--size) solid var(--color-theme-1);
	}

	nav a,
	nav button.logout-button {
		display: flex;
		height: 100%;
		align-items: center;
		padding: 0 0.5rem;
		color: var(--color-text);
		font-weight: 700;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		text-decoration: none;
		transition: color 0.2s linear;
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
	}

	nav button.logout-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	li.user-info {
		display: flex;
		align-items: center;
		padding: 0 0.5rem;
	}

	li.user-info .text-muted {
		font-size: 0.8rem;
		color: var(--color-text);
		opacity: 0.7;
	}

	a:hover,
	button.logout-button:hover:not(:disabled) {
		color: var(--color-theme-1);
	}
</style>
