import { RestClient } from './client';
import { mapRawPost } from './mapPost';
import { WPPost, GetPostsParams, PaginatedResult } from '../../types';
import { WPNotFoundError } from '../../utils/errors';
import { WPCollectionSource } from '../types';
import { fetchRankMathSeo } from '../../seo/rankmath';

export class RestCollection implements WPCollectionSource {
  constructor(private client: RestClient, private restBase: string) {}

  async getAll(params: GetPostsParams = {}): Promise<PaginatedResult<WPPost>> {
    const searchParams: Record<string, string> = {
      _embed: 'wp:featuredmedia,wp:term,author',
      page: String(params.page ?? 1),
      per_page: String(params.perPage ?? 10),
    };
    if (params.search) searchParams.search = params.search;
    if (params.categories?.length) searchParams.categories = params.categories.join(',');
    if (params.slug) searchParams.slug = params.slug;

    const { data, total, totalPages } = await this.client.getPaginated<any[]>(
      `/${this.restBase}`,
      searchParams
    );

    const config = this.client.getConfig();

    return {
      items: data.map((raw) => mapRawPost(raw, config.sanitize, config.output)),
      total,
      totalPages,
      page: params.page ?? 1,
    };
  }

  async getBySlug(slug: string): Promise<WPPost> {
    const result = await this.getAll({ slug, perPage: 1 });
    if (!result.items.length) {
      throw new WPNotFoundError(`"${this.restBase}" item not found: ${slug}`);
    }

    const post = result.items[0];
    return this.maybeEnrichWithRankMathSeo(post);
  }

  /**
   * Single-item fetches only (never getAll/lists — see fetchRankMathSeo's
   * doc comment for why). Opt-in via config.seo.rankMathHeadless, since it
   * costs one extra request and only works if the WordPress site has
   * RankMath's "Headless CMS Support" setting enabled.
   */
  private async maybeEnrichWithRankMathSeo(post: WPPost): Promise<WPPost> {
    const config = this.client.getConfig();
    if (!config.seo?.rankMathHeadless) return post;
    if (post.seo.source !== 'none') return post; // already have SEO data, don't overwrite it

    // If includeRaw was turned off, `post.raw` won't exist — RankMath
    // enrichment needs the page's permalink, which lives there, so this
    // silently no-ops rather than erroring in that configuration.
    const pageUrl = post.raw?.link as string | undefined;
    if (!pageUrl) return post;

    const rankMathSeo = await fetchRankMathSeo(config.baseUrl, pageUrl, {
      timeoutMs: config.timeoutMs,
    });
    if (!rankMathSeo) return post; // endpoint disabled, network error, etc. — degrade quietly

    return { ...post, seo: rankMathSeo };
  }
}
