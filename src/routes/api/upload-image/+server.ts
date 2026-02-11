import { uploadImageAssets } from '$lib/server/upload-image';
import { json } from '@sveltejs/kit';
import { UPLOAD, OPERATION_TYPE } from '$lib/config/constants';
import { withCredits } from '$lib/server/credits-middleware';
import { calculateCost } from '$lib/server/operation-costs.config';
import { createLogger } from '$lib/server/logger';

const log = createLogger('api-upload');

export const POST = withCredits(
    async ({ request, creditContext }) => {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return {
                response: json({ error: 'No file provided' }, { status: 400 })
            };
        }

        // Validate MIME type - only allow image files (excluding SVG for security)
        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            // 'image/svg+xml' - Removed: SVG can contain malicious scripts
        ];

        if (!allowedMimeTypes.includes(file.type)) {
            return {
                response: json({ error: 'Invalid file type. Only image files are allowed.' }, { status: 400 })
            };
        }

        // Validate file size
        if (file.size > UPLOAD.SERVER_MAX_SIZE_BYTES) {
            return {
                response: json({ error: `File too large. Maximum size allowed is ${UPLOAD.SERVER_MAX_SIZE_MB}MB.` }, { status: 400 })
            };
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Generate a unique filename with userId prefix for traceability
        const fileExt = file.name.split('.').pop() || '';
        const timestamp = Date.now();
        const filename = `${creditContext.userId}/${timestamp}.${fileExt || 'png'}`;

        try {
            // Upload the file
            const url = await uploadImageAssets(buffer, filename, file.type);

            // 上传成功，扣除积分
            const creditsToDeduct = calculateCost(1, 'image_generation');

            return {
                response: json({ url }),
                usage: {
                    creditsToDeduct,
                    metadata: {
                        fileType: file.type,
                        fileSize: file.size,
                        filename
                    }
                }
            };
        } catch (error) {
            log.error('Upload error', error instanceof Error ? error : new Error(String(error)));
            return {
                response: json({ error: 'Failed to process upload' }, { status: 500 })
            };
        }
    },
    {
        operationType: OPERATION_TYPE.IMAGE_GENERATION,
        minCreditsRequired: 5
    }
);
