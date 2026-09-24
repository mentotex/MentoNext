import { RestClient } from './client';
import { WPSearchResult, SearchParams } from '../../types';

interface RawSearchResult {
  id: number;
  title: string;
  url: string;
  type: string;
  subtype: string;
}

function mapRawSearchResult(raw: RawSearchResult): WPSearchResult {
  return {
    id: raw.id,
    title: raw.title ?? '',
    url: raw.url ?? '',
    type: raw.type ?? '',
    subtype: raw.subtype ?? '',
  };
}

/**
 * Uses WordPress core's dedicated /wp/v2/search endpoint — a cross-type
 * search (posts, pages, and any public post type at once) that's separate
 * from filtering a single collection with getPosts({ search }). This is
 * the right tool for a site-wide search box; getPosts({ search }) is still
 * the right tool when you specifically only want to search posts.
 */
export async function searchContent(client: RestClient, query: string, params: SearchParams = {}): Promise<WPSearchResult[]> {
  const searchParams: Record<string, string> = {
    search: query,
    per_page: String(params.perPage ?? 10),
  };
  if (params.subtype?.length) {
    searchParams.subtype = params.subtype.join(',');
  }

  const results = await client.get<RawSearchResult[]>('/search', searchParams);
  return results.map(mapRawSearchResult);
}
