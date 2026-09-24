import { RestDataSource } from './api/rest/dataSource';
import { WPAdapterConfig } from './types';
import { WPDataSource } from './api/types';

/**
 * Creates a WordPress data client. Returns the `WPDataSource` interface
 * rather than the concrete REST implementation, so the same public API
 * keeps working if a GraphQL-backed implementation is added later — code
 * written against `createWPClient()`'s return value never depends on which
 * adapter is actually behind it.
 */
export function createWPClient(config: WPAdapterConfig): WPDataSource {
  return new RestDataSource(config);
}

export * from './types';
export * from './utils/errors';
export * from './utils/media';
export * from './utils/sanitize';
export { fetchRankMathSeo } from './seo/rankmath';
export type { WPDataSource, WPCollectionSource, WPTermSource } from './api/types';
export { toNextMetadata, toJsonLdScriptProps } from './nextjs/metadata';
export type { NextMetadataLike } from './nextjs/metadata';
export { toStaticParams } from './nextjs/staticParams';
export type { ToStaticParamsOptions, SlugPageSource } from './nextjs/staticParams';
export { verifyWebhookSecret } from './utils/webhook';
