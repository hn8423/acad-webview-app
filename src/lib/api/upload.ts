import { upload } from './client';
import type { ApiResponse } from '$lib/types/api';
import type { UploadResponse } from '$lib/types/upload';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_IMAGE_TYPES: readonly string[] = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/heic'
];
const ALLOWED_VIDEO_TYPES: readonly string[] = [
	'video/mp4',
	'video/webm',
	'video/quicktime',
	'video/x-msvideo'
];
const ALLOWED_TYPES: readonly string[] = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'svg'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv'];

function getExtension(urlOrMime: string): string {
	return urlOrMime.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
}

export function validateMediaFile(file: File): string | null {
	if (!ALLOWED_TYPES.includes(file.type)) {
		return '지원하지 않는 파일 형식입니다. (이미지: JPG, PNG, GIF, WebP / 영상: MP4, WebM, MOV)';
	}
	if (file.size > MAX_FILE_SIZE) {
		return '파일 크기는 100MB 이하여야 합니다.';
	}
	return null;
}

export function isImageType(urlOrMime: string): boolean {
	if (ALLOWED_IMAGE_TYPES.includes(urlOrMime)) return true;
	return IMAGE_EXTENSIONS.includes(getExtension(urlOrMime));
}

export function isVideoType(urlOrMime: string): boolean {
	if (ALLOWED_VIDEO_TYPES.includes(urlOrMime)) return true;
	return VIDEO_EXTENSIONS.includes(getExtension(urlOrMime));
}

export function uploadMedia(file: File): Promise<ApiResponse<UploadResponse>> {
	const formData = new FormData();
	formData.append('media_files', file);
	return upload<ApiResponse<UploadResponse>>('/academic/uploads', formData);
}
