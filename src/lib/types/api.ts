export interface ApiResponse<T> {
	status: boolean;
	message: string;
	data: T;
}

export interface PaginationMeta {
	total: number;
	page: number;
	limit: number;
}

export interface PaginatedList<T> {
	list: T[];
	meta: PaginationMeta;
}

export interface CursorMeta {
	next_cursor: number | null;
}

export interface CursorPaginatedList<T> {
	list: T[];
	meta: CursorMeta;
}

export class ApiError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}
