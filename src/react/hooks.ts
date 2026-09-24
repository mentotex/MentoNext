import { useWPClient } from './WPProvider';
import { useWPQuery, type UseWPQueryResult } from './useWPQuery';
import {
  WPPost,
  WPTerm,
  WPAuthor,
  WPMenuItem,
  WPSearchResult,
  GetPostsParams,
  GetTermsParams,
  GetAuthorsParams,
  SearchParams,
  PaginatedResult,
} from '../types';

export function usePosts(params: GetPostsParams = {}): UseWPQueryResult<PaginatedResult<WPPost>> {
  const wp = useWPClient();
  return useWPQuery(
    () => wp.getPosts(params),
    [wp, params.page, params.perPage, params.search, params.slug, params.categories?.join(',')]
  );
}

export function usePost(slug: string): UseWPQueryResult<WPPost> {
  const wp = useWPClient();
  return useWPQuery(() => wp.getPostBySlug(slug), [wp, slug]);
}

export function usePages(params: GetPostsParams = {}): UseWPQueryResult<PaginatedResult<WPPost>> {
  const wp = useWPClient();
  return useWPQuery(
    () => wp.getPages(params),
    [wp, params.page, params.perPage, params.search, params.slug]
  );
}

export function usePage(slug: string): UseWPQueryResult<WPPost> {
  const wp = useWPClient();
  return useWPQuery(() => wp.getPageBySlug(slug), [wp, slug]);
}

export function useCustomPostType(
  restBase: string,
  params: GetPostsParams = {}
): UseWPQueryResult<PaginatedResult<WPPost>> {
  const wp = useWPClient();
  return useWPQuery(
    () => wp.customPostType(restBase).getAll(params),
    [wp, restBase, params.page, params.perPage, params.search, params.slug]
  );
}

export function useCategories(params: GetTermsParams = {}): UseWPQueryResult<PaginatedResult<WPTerm>> {
  const wp = useWPClient();
  return useWPQuery(
    () => wp.getCategories(params),
    [wp, params.page, params.perPage, params.search, params.slug]
  );
}

export function useTags(params: GetTermsParams = {}): UseWPQueryResult<PaginatedResult<WPTerm>> {
  const wp = useWPClient();
  return useWPQuery(
    () => wp.getTags(params),
    [wp, params.page, params.perPage, params.search, params.slug]
  );
}

export function useTaxonomy(
  restBase: string,
  taxonomyName: string,
  params: GetTermsParams = {}
): UseWPQueryResult<PaginatedResult<WPTerm>> {
  const wp = useWPClient();
  return useWPQuery(
    () => wp.taxonomy(restBase, taxonomyName).getAll(params),
    [wp, restBase, taxonomyName, params.page, params.perPage, params.search, params.slug]
  );
}

export function useAuthors(params: GetAuthorsParams = {}): UseWPQueryResult<PaginatedResult<WPAuthor>> {
  const wp = useWPClient();
  return useWPQuery(
    () => wp.getAuthors(params),
    [wp, params.page, params.perPage, params.search, params.slug]
  );
}

export function useAuthor(slug: string): UseWPQueryResult<WPAuthor> {
  const wp = useWPClient();
  return useWPQuery(() => wp.getAuthorBySlug(slug), [wp, slug]);
}

/** location: a registered theme location name (e.g. "primary") or a numeric menu ID. */
export function useMenu(location: string | number): UseWPQueryResult<WPMenuItem[]> {
  const wp = useWPClient();
  return useWPQuery(() => wp.getMenu(location), [wp, location]);
}

/**
 * Site-wide search (WP's /wp/v2/search). `query` may be an empty string —
 * the hook still runs (and WordPress will just return no/most-recent
 * results), so gate rendering on `query` yourself if you want to skip
 * firing a request before the visitor has typed anything.
 */
export function useSearch(query: string, params: SearchParams = {}): UseWPQueryResult<WPSearchResult[]> {
  const wp = useWPClient();
  return useWPQuery(
    () => wp.search(query, params),
    [wp, query, params.perPage, params.subtype?.join(',')]
  );
}
