import type { RequestHandler } from './$types';
import { env as privateEnv } from '$env/dynamic/private';

const API_BASE = (privateEnv.API_BASE || 'http://localhost:5261').replace(/\/$/, '');

async function proxy(event: Parameters<RequestHandler>[0]) {
	const { request, url, fetch } = event;

	// Preserve the original /api/... path when forwarding to backend
	const targetUrl = `${API_BASE}${url.pathname}${url.search}`;

	const incoming = request.headers;
	const forwardHeaders = new Headers();
	for (const [key, value] of incoming) {
		const k = key.toLowerCase();
		if (k === 'host' || k === 'connection' || k === 'content-length') continue;
		if (k === 'accept-encoding') continue;
		forwardHeaders.set(key, value);
	}

	const method = request.method.toUpperCase();
	let body: BodyInit | undefined = undefined;
	if (method !== 'GET' && method !== 'HEAD') {
		const buf = await request.arrayBuffer();
		if (buf.byteLength > 0) body = buf as unknown as BodyInit;
	}

	const upstream = await fetch(targetUrl, {
		method,
		headers: forwardHeaders,
		body,
		redirect: 'manual'
	});

	const responseHeaders = new Headers();
	for (const [key, value] of upstream.headers) {
		if (key.toLowerCase() === 'set-cookie') continue;
		responseHeaders.set(key, value);
	}

	const getSetCookie = (upstream.headers as any).getSetCookie?.() as string[] | undefined;
	if (getSetCookie && Array.isArray(getSetCookie)) {
		for (const c of getSetCookie) responseHeaders.append('set-cookie', c);
	} else {
		const single = upstream.headers.get('set-cookie');
		if (single) responseHeaders.append('set-cookie', single);
	}

	return new Response(upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers: responseHeaders
	});
}

export const GET: RequestHandler = (event) => proxy(event);
export const POST: RequestHandler = (event) => proxy(event);
export const PUT: RequestHandler = (event) => proxy(event);
export const PATCH: RequestHandler = (event) => proxy(event);
export const DELETE: RequestHandler = (event) => proxy(event);
export const HEAD: RequestHandler = (event) => proxy(event);
export const OPTIONS: RequestHandler = (event) => proxy(event);
