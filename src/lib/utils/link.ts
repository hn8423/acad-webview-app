import { z } from 'zod';

const urlSchema = z
	.string()
	.url()
	.refine((val) => val.startsWith('http://') || val.startsWith('https://'), {
		message: 'URL must start with http:// or https://'
	});

/**
 * Validate that a string is a well-formed HTTP(S) URL.
 */
export function isValidUrl(url: string): boolean {
	return urlSchema.safeParse(url).success;
}

/**
 * Escape HTML special characters to prevent injection.
 */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Build a safe <a> tag with target="_blank" and rel="noopener noreferrer".
 */
export function buildLinkTag(url: string, displayText: string): string {
	const safeUrl = url.trim();
	const safeText = displayText.trim() || safeUrl;

	const escapedUrl = escapeHtml(safeUrl);
	const escapedText = escapeHtml(safeText);

	return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapedText}</a>`;
}

/**
 * Convert plain-text URLs in content to clickable <a> tags.
 * Skips URLs that are already inside an <a> tag's href attribute.
 */
export function autoLinkify(content: string): string {
	const urlRegex = /(?<!href="|href='|>)(https?:\/\/[^\s<>"']+)/g;

	return content.replace(urlRegex, (match) => {
		return buildLinkTag(match, match);
	});
}

/**
 * Ensure all <a> tags in content have target="_blank" rel="noopener noreferrer".
 */
export function sanitizeLinks(content: string): string {
	return content.replace(/<a\s([^>]*)>/gi, (_fullMatch, attrs: string) => {
		let sanitized = attrs;

		if (!/target\s*=/i.test(sanitized)) {
			sanitized += ' target="_blank"';
		} else {
			sanitized = sanitized.replace(/target\s*=\s*["'][^"']*["']/i, 'target="_blank"');
		}

		if (!/rel\s*=/i.test(sanitized)) {
			sanitized += ' rel="noopener noreferrer"';
		} else {
			sanitized = sanitized.replace(/rel\s*=\s*["'][^"']*["']/i, 'rel="noopener noreferrer"');
		}

		return `<a ${sanitized.trim()}>`;
	});
}

/**
 * Process notice content for safe display:
 * 1. Auto-linkify plain URLs
 * 2. Sanitize all <a> tags for safe behavior
 */
export function processNoticeContent(content: string): string {
	const linkified = autoLinkify(content);
	return sanitizeLinks(linkified);
}
