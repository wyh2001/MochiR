import type { components } from './types';
import { api } from './client';
import { SUBJECTS_BASE } from './endpoints';

export type SubjectSummaryDto = components['schemas']['SubjectSummaryDto'];
export type SubjectDetailDto = components['schemas']['SubjectDetailDto'];
export type CreateSubjectDto = components['schemas']['CreateSubjectDto'];
type SubjectSummaryList = components['schemas']['SubjectSummaryDto'][] | null | undefined;

function ensureSubjectList(list: SubjectSummaryList): SubjectSummaryDto[] {
	return list ?? [];
}

/**
 * Get list of subjects with optional filters
 */
export async function getSubjects(fetchFn?: typeof fetch): Promise<SubjectSummaryDto[]> {
	const list = await api.get<SubjectSummaryDto[]>(SUBJECTS_BASE, { fetch: fetchFn });
	return ensureSubjectList(list);
}

/**
 * Get subject details by ID
 */
export async function getSubjectById(
	id: number,
	fetchFn?: typeof fetch
): Promise<SubjectDetailDto> {
	return (await api.get<SubjectDetailDto>(`${SUBJECTS_BASE}/${id}`, {
		fetch: fetchFn
	}))!;
}

/**
 * Get subject by slug
 */
export async function getSubjectBySlug(): Promise<SubjectDetailDto> {
	throw new Error('Backend does not provide slug lookup endpoint.');
}

/**
 * Create a new subject (admin only)
 */
export async function createSubject(
	subject: CreateSubjectDto,
	fetchFn?: typeof fetch
): Promise<SubjectSummaryDto> {
	return (await api.post<SubjectSummaryDto>(SUBJECTS_BASE, subject, { fetch: fetchFn }))!;
}

/**
 * Update a subject (admin only)
 */
export async function updateSubject(
	id: number,
	subject: Partial<CreateSubjectDto>,
	fetchFn?: typeof fetch
): Promise<SubjectSummaryDto> {
	return (await api.put<SubjectSummaryDto>(`${SUBJECTS_BASE}/${id}`, subject, { fetch: fetchFn }))!;
}

/**
 * Delete a subject (admin only)
 */
export async function deleteSubject(id: number, fetchFn?: typeof fetch): Promise<void> {
	return await api.delete<void>(`${SUBJECTS_BASE}/${id}`, { fetch: fetchFn });
}

/**
 * Search subjects by name or slug
 */
export async function searchSubjects(): Promise<SubjectSummaryDto[]> {
	throw new Error('Backend does not provide search endpoint.');
}
