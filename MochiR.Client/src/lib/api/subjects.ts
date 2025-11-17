import { api } from './client';
import { SUBJECTS_BASE } from './endpoints';

export interface SubjectSummaryDto {
	id: number;
	name: string;
	slug: string;
	subjectTypeId: number;
}

export interface SubjectDetailDto extends SubjectSummaryDto {
	subjectTypeKey?: string | null;
	subjectTypeDisplayName?: string | null;
	attributes?: { key: string; value?: string | null; note?: string | null }[];
	createdAt?: string | Date;
}

export interface CreateSubjectDto {
	name: string;
	slug: string;
	subjectTypeId: number;
	attributes?: { key: string; value?: string | null; note?: string | null }[];
}

export interface PaginatedResponse<T> {
	items: T[];
	totalCount: number;
	pageNumber: number;
	pageSize: number;
	totalPages: number;
}

/**
 * Get list of subjects with optional filters
 */
export async function getSubjects(
	fetchFn?: typeof fetch
): Promise<PaginatedResponse<SubjectSummaryDto>> {
	const arr = await api.get<SubjectSummaryDto[]>(SUBJECTS_BASE, { auth: false, fetch: fetchFn });
	return {
		items: arr,
		totalCount: arr.length,
		pageNumber: 1,
		pageSize: arr.length,
		totalPages: 1
	};
}

/**
 * Get subject details by ID
 */
export async function getSubjectById(
	id: number,
	fetchFn?: typeof fetch
): Promise<SubjectDetailDto> {
	return await api.get<SubjectDetailDto>(`${SUBJECTS_BASE}/${id}`, { auth: false, fetch: fetchFn });
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
	return await api.post<SubjectSummaryDto>(SUBJECTS_BASE, subject, { fetch: fetchFn });
}

/**
 * Update a subject (admin only)
 */
export async function updateSubject(
	id: number,
	subject: Partial<CreateSubjectDto>,
	fetchFn?: typeof fetch
): Promise<SubjectSummaryDto> {
	return await api.put<SubjectSummaryDto>(`${SUBJECTS_BASE}/${id}`, subject, { fetch: fetchFn });
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
