import { RestClient } from './client';
import { RestCollection } from './collection';
import { RestTermCollection } from './terms';
import { RestAuthorCollection } from './authors';
import { fetchMenu } from './menu';
import { searchContent } from './search';
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
  WPAdapterConfig,
} from '../../types';
import { WPDataSource, WPCollectionSource, WPTermSource } from '../types';

export class RestDataSource implements WPDataSource {
  private client: RestClient;
  private posts: RestCollection;
  private pages: RestCollection;
  private categoryTerms: RestTermCollection;
  private tagTerms: RestTermCollection;
  private authors: RestAuthorCollection;
  private customTypes = new Map<string, RestCollection>();
  private customTaxonomies = new Map<string, RestTermCollection>();

  constructor(config: WPAdapterConfig) {
    this.client = new RestClient(config);
    this.posts = new RestCollection(this.client, 'posts');
    this.pages = new RestCollection(this.client, 'pages');
    this.categoryTerms = new RestTermCollection(this.client, 'categories', 'category');
    this.tagTerms = new RestTermCollection(this.client, 'tags', 'post_tag');
    this.authors = new RestAuthorCollection(this.client);
  }

  getPosts(params?: GetPostsParams): Promise<PaginatedResult<WPPost>> {
    return this.posts.getAll(params);
  }

  getPostBySlug(slug: string): Promise<WPPost> {
    return this.posts.getBySlug(slug);
  }

  getPages(params?: GetPostsParams): Promise<PaginatedResult<WPPost>> {
    return this.pages.getAll(params);
  }

  getPageBySlug(slug: string): Promise<WPPost> {
    return this.pages.getBySlug(slug);
  }

  customPostType(restBase: string): WPCollectionSource {
    if (!this.customTypes.has(restBase)) {
      this.customTypes.set(restBase, new RestCollection(this.client, restBase));
    }
    return this.customTypes.get(restBase)!;
  }

  getCategories(params?: GetTermsParams): Promise<PaginatedResult<WPTerm>> {
    return this.categoryTerms.getAll(params);
  }

  getCategoryBySlug(slug: string): Promise<WPTerm> {
    return this.categoryTerms.getBySlug(slug);
  }

  getTags(params?: GetTermsParams): Promise<PaginatedResult<WPTerm>> {
    return this.tagTerms.getAll(params);
  }

  getTagBySlug(slug: string): Promise<WPTerm> {
    return this.tagTerms.getBySlug(slug);
  }

  taxonomy(restBase: string, taxonomyName: string): WPTermSource {
    const key = `${restBase}:${taxonomyName}`;
    if (!this.customTaxonomies.has(key)) {
      this.customTaxonomies.set(key, new RestTermCollection(this.client, restBase, taxonomyName));
    }
    return this.customTaxonomies.get(key)!;
  }

  getAuthors(params?: GetAuthorsParams): Promise<PaginatedResult<WPAuthor>> {
    return this.authors.getAll(params);
  }

  getAuthorBySlug(slug: string): Promise<WPAuthor> {
    return this.authors.getBySlug(slug);
  }

  getMenu(location: string | number): Promise<WPMenuItem[]> {
    return fetchMenu(this.client, location);
  }

  search(query: string, params?: SearchParams): Promise<WPSearchResult[]> {
    return searchContent(this.client, query, params);
  }

  clearCache(): Promise<void> {
    return this.client.clearCache();
  }
}
