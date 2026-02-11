// API 响应/错误类型

export interface ApiErrorResponse {
	error: string;
	code?: string;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
}
