import { RestClient } from './client';
import { mapRawTerm } from './mapTerm';
import { WPTerm, GetTermsParams, PaginatedResult } from '../../types';
import { WPNotFoundError } from '../../utils/errors';
import { WPTermSource } from '../types';

export class RestTermCollection implements WPTermSource {
  constructor(
    private client: RestClient,
    private restBase: string,
    private taxonomy: string
  ) {}

  async getAll(params: GetTermsParams = {}): Promise<PaginatedResult<WPTerm>> {
    const searchParams: Record<string, string> = {
      page: String(params.page ?? 1),
      per_page: String(params.perPage ?? 10),
    };
    if (params.search) searchParams.search = params.search;
    if (params.slug) searchParams.slug = params.slug;

    const { data, total, totalPages } = await this.client.getPaginated<any[]>(
      `/${this.restBase}`,
      searchParams
    );

    return {
      items: data.map((raw) => mapRawTerm(raw, this.taxonomy)),
      total,
      totalPages,
      page: params.page ?? 1,
    };
  }

  async getBySlug(slug: string): Promise<WPTerm> {
    const result = await this.getAll({ slug, perPage: 1 });
    if (!result.items.length) {
      throw new WPNotFoundError(`Term not found in "${this.restBase}": ${slug}`);
    }
    return result.items[0];
  }
}
