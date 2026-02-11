/**
 * 通用分页状态类
 * 可被 admin store、user store 等各处复用。
 * 使用 Svelte 5 Runes 模式。
 */

import { PAGINATION } from '$lib/config/constants';

export class PaginatedState<T> {
	items = $state<T[]>([]);
	loading = $state(false);
	initialized = $state(false);
	page = $state(1);
	limit: number;
	total = $state(0);

	constructor(limit: number = PAGINATION.DEFAULT_LIMIT) {
		this.limit = limit;
	}

	get offset() {
		return (this.page - 1) * this.limit;
	}

	get hasMore() {
		return this.page * this.limit < this.total;
	}

	get hasPrev() {
		return this.page > 1;
	}

	get totalPages() {
		return Math.ceil(this.total / this.limit);
	}

	get pageInfo() {
		const start = this.total === 0 ? 0 : this.offset + 1;
		const end = Math.min(this.page * this.limit, this.total);
		return { start, end, total: this.total };
	}

	reset() {
		this.items = [];
		this.page = 1;
		this.total = 0;
		this.initialized = false;
	}
}
