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

export interface WPCollectionSource {
  getAll(params?: GetPostsParams): Promise<PaginatedResult<WPPost>>;
  getBySlug(slug: string): Promise<WPPost>;
}

export interface WPTermSource {
  getAll(params?: GetTermsParams): Promise<PaginatedResult<WPTerm>>;
  getBySlug(slug: string): Promise<WPTerm>;
}

export interface WPDataSource {
  getPosts(params?: GetPostsParams): Promise<PaginatedResult<WPPost>>;
  getPostBySlug(slug: string): Promise<WPPost>;
  getPages(params?: GetPostsParams): Promise<PaginatedResult<WPPost>>;
  getPageBySlug(slug: string): Promise<WPPost>;
  customPostType(restBase: string): WPCollectionSource;

  getCategories(params?: GetTermsParams): Promise<PaginatedResult<WPTerm>>;
  getCategoryBySlug(slug: string): Promise<WPTerm>;
  getTags(params?: GetTermsParams): Promise<PaginatedResult<WPTerm>>;
  getTagBySlug(slug: string): Promise<WPTerm>;
  taxonomy(restBase: string, taxonomyName: string): WPTermSource;

  getAuthors(params?: GetAuthorsParams): Promise<PaginatedResult<WPAuthor>>;
  getAuthorBySlug(slug: string): Promise<WPAuthor>;

  /** location: a registered theme location name (e.g. "primary") or a numeric menu ID. */
  getMenu(location: string | number): Promise<WPMenuItem[]>;

  /** Site-wide search across posts, pages, and other public post types (WP's /wp/v2/search). */
  search(query: string, params?: SearchParams): Promise<WPSearchResult[]>;

  clearCache(): Promise<void>;
}
