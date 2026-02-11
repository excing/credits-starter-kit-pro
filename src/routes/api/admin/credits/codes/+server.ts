import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRedemptionCodes } from '$lib/server/credits';
import { parsePagination } from '$lib/config/constants';
import { errorResponse } from '$lib/server/errors';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const { limit, offset } = parsePagination(url);
		const status = url.searchParams.get('status') as 'active' | 'used' | 'expired' | 'disabled' | null;
		const packageId = url.searchParams.get('packageId');

		const filters: { status?: 'active' | 'used' | 'expired' | 'disabled'; packageId?: string } = {};
		if (status && ['active', 'used', 'expired', 'disabled'].includes(status)) {
			filters.status = status;
		}
		if (packageId) {
			filters.packageId = packageId;
		}

		const { codes, total } = await getRedemptionCodes(limit, offset, filters);

		return json({ codes, total, limit, offset });
	} catch (error) {
		return errorResponse(error, '获取失败');
	}
};
