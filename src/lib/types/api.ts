export interface ApiResponse<T> {
	status: boolean;
	message: string;
	data: T;
}

export interface PaginatedData<T> {
	list: T[];
	meta: {
		total: number;
		page: number;
		limit: number;
	};
}

export interface CursorPaginatedData<T> {
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
