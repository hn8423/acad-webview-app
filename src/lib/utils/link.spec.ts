import { describe, it, expect } from 'vitest';
import { isValidUrl, buildLinkTag, autoLinkify, sanitizeLinks, processNoticeContent } from './link';

describe('isValidUrl', () => {
	it('should accept valid https URL', () => {
		expect(isValidUrl('https://example.com')).toBe(true);
	});

	it('should accept valid http URL', () => {
		expect(isValidUrl('http://example.com/path?q=1')).toBe(true);
	});

	it('should accept URL with path and query', () => {
		expect(isValidUrl('https://example.com/page?key=value&foo=bar')).toBe(true);
	});

	it('should reject non-http protocol', () => {
		expect(isValidUrl('ftp://example.com')).toBe(false);
	});

	it('should reject javascript protocol', () => {
		expect(isValidUrl('javascript:alert(1)')).toBe(false);
	});

	it('should reject invalid string', () => {
		expect(isValidUrl('not a url')).toBe(false);
	});

	it('should reject empty string', () => {
		expect(isValidUrl('')).toBe(false);
	});
});

describe('buildLinkTag', () => {
	it('should create a tag with target and rel attributes', () => {
		const result = buildLinkTag('https://example.com', 'Example');
		expect(result).toContain('target="_blank"');
		expect(result).toContain('rel="noopener noreferrer"');
		expect(result).toContain('href="https://example.com"');
		expect(result).toContain('>Example</a>');
	});

	it('should use URL as display text when displayText is empty', () => {
		const result = buildLinkTag('https://example.com', '');
		expect(result).toContain('>https://example.com</a>');
	});

	it('should trim whitespace from url and text', () => {
		const result = buildLinkTag('  https://example.com  ', '  Example  ');
		expect(result).toContain('href="https://example.com"');
		expect(result).toContain('>Example</a>');
	});

	it('should escape HTML in display text', () => {
		const result = buildLinkTag('https://example.com', '<script>alert("xss")</script>');
		expect(result).not.toContain('<script>');
		expect(result).toContain('&lt;script&gt;');
	});

	it('should escape HTML special characters in URL', () => {
		const result = buildLinkTag('https://example.com/path?a=1&b=2', 'Test');
		expect(result).toContain('&amp;');
	});
});

describe('autoLinkify', () => {
	it('should convert plain https URL to link', () => {
		const result = autoLinkify('Visit https://example.com today');
		expect(result).toContain('<a href=');
		expect(result).toContain('https://example.com');
		expect(result).toContain('target="_blank"');
	});

	it('should convert plain http URL to link', () => {
		const result = autoLinkify('See http://example.com for details');
		expect(result).toContain('<a href=');
	});

	it('should not double-wrap URLs already in anchor tags', () => {
		const input = '<a href="https://example.com">link</a>';
		const result = autoLinkify(input);
		expect(result.match(/<a /g)?.length).toBe(1);
	});

	it('should handle multiple URLs', () => {
		const input = 'See https://a.com and https://b.com';
		const result = autoLinkify(input);
		expect(result.match(/<a /g)?.length).toBe(2);
	});

	it('should handle content with no URLs', () => {
		const input = 'No links here.';
		expect(autoLinkify(input)).toBe(input);
	});

	it('should handle URL at start of content', () => {
		const result = autoLinkify('https://example.com is a great site');
		expect(result).toContain('<a href=');
	});

	it('should handle URL at end of content', () => {
		const result = autoLinkify('Visit https://example.com');
		expect(result).toContain('<a href=');
	});
});

describe('sanitizeLinks', () => {
	it('should add target and rel to bare anchor tags', () => {
		const input = '<a href="https://example.com">link</a>';
		const result = sanitizeLinks(input);
		expect(result).toContain('target="_blank"');
		expect(result).toContain('rel="noopener noreferrer"');
	});

	it('should override existing target attribute', () => {
		const input = '<a href="https://example.com" target="_self">link</a>';
		const result = sanitizeLinks(input);
		expect(result).toContain('target="_blank"');
		expect(result).not.toContain('target="_self"');
	});

	it('should override existing rel attribute', () => {
		const input = '<a href="https://example.com" rel="nofollow">link</a>';
		const result = sanitizeLinks(input);
		expect(result).toContain('rel="noopener noreferrer"');
		expect(result).not.toContain('rel="nofollow"');
	});

	it('should not modify non-link HTML', () => {
		const input = '<p>Hello</p>';
		expect(sanitizeLinks(input)).toBe(input);
	});

	it('should handle multiple anchor tags', () => {
		const input = '<a href="https://a.com">A</a> and <a href="https://b.com">B</a>';
		const result = sanitizeLinks(input);
		expect(result.match(/target="_blank"/g)?.length).toBe(2);
		expect(result.match(/rel="noopener noreferrer"/g)?.length).toBe(2);
	});

	it('should preserve existing href attribute', () => {
		const input = '<a href="https://example.com">link</a>';
		const result = sanitizeLinks(input);
		expect(result).toContain('href="https://example.com"');
	});
});

describe('processNoticeContent', () => {
	it('should linkify plain URLs and sanitize all links', () => {
		const input = 'Visit https://example.com and <a href="https://other.com">other</a>';
		const result = processNoticeContent(input);
		const matches = result.match(/target="_blank"/g);
		expect(matches?.length).toBe(2);
	});

	it('should handle content with no links', () => {
		const input = 'Just plain text content.';
		expect(processNoticeContent(input)).toBe(input);
	});

	it('should handle empty content', () => {
		expect(processNoticeContent('')).toBe('');
	});

	it('should handle content with only HTML', () => {
		const input = '<p>Hello <strong>world</strong></p>';
		expect(processNoticeContent(input)).toBe(input);
	});
});
