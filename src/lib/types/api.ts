export interface ApiResponse<T> {
	status: boolean;
	message: string;
	data: T;
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
