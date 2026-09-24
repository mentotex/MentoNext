import sanitizeHtmlLib from 'sanitize-html';
import { SanitizeOptions } from '../types';

const DEFAULT_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'blockquote',
  'ul', 'ol', 'li', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'code', 'pre', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'figure', 'figcaption', 'hr',
];

const DEFAULT_ALLOWED_ATTRIBUTES: sanitizeHtmlLib.IOptions['allowedAttributes'] = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height', 'srcset', 'sizes', 'loading'],
  '*': ['class'],
};

export function sanitizeHtml(html: string, options?: SanitizeOptions | false): string {
  if (options === false) return html;

  return sanitizeHtmlLib(html, {
    allowedTags: options?.allowedTags ?? DEFAULT_ALLOWED_TAGS,
    allowedAttributes: options?.allowedAttributes ?? DEFAULT_ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: {
      a: sanitizeHtmlLib.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
    },
  });
}

export function sanitizeText(html: string): string {
  return sanitizeHtmlLib(html, { allowedTags: [], allowedAttributes: {} }).trim();
}
