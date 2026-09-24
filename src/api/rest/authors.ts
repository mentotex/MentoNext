import { RestClient } from './client';
import { mapRawAuthor } from './mapAuthor';
import { WPAuthor, GetAuthorsParams, PaginatedResult } from '../../types';
import { WPNotFoundError } from '../../utils/errors';

/**
 * Wraps WordPress's /wp/v2/users endpoint. Public by default, but WP
 * automatically restricts unauthenticated responses to users who have at
 * least one published post — a built-in privacy safeguard against
 * enumerating every registered account, not something this package needs
 * to work around. Unlike menus, no WordPress-side setting is required.
 */
export class RestAuthorCollection {
  constructor(private client: RestClient) {}

  async getAll(params: GetAuthorsParams = {}): Promise<PaginatedResult<WPAuthor>> {
    const searchParams: Record<string, string> = {
      page: String(params.page ?? 1),
      per_page: String(params.perPage ?? 10),
    };
    if (params.search) searchParams.search = params.search;
    if (params.slug) searchParams.slug = params.slug;

    const { data, total, totalPages } = await this.client.getPaginated<any[]>('/users', searchParams);

    return {
      items: data.map(mapRawAuthor),
      total,
      totalPages,
      page: params.page ?? 1,
    };
  }

  async getBySlug(slug: string): Promise<WPAuthor> {
    const result = await this.getAll({ slug, perPage: 1 });
    if (!result.items.length) {
      throw new WPNotFoundError(`Author not found: ${slug}`);
    }
    return result.items[0];
  }
}
