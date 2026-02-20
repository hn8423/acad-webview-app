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

export interface CursorPaginatedList<T> {
	list: T[];
	next_cursor: number | null;
	has_more: boolean;
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
