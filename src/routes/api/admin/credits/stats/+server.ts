import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminOverviewStats } from '$lib/server/credits';
import { errorResponse } from '$lib/server/errors';

export const GET: RequestHandler = async () => {
	try {
		const stats = await getAdminOverviewStats();
		return json(stats);
	} catch (error) {
		return errorResponse(error, '获取统计失败');
	}
};
