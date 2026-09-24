import { WPTerm } from '../../types';

export function mapRawTerm(raw: any, taxonomy: string): WPTerm {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description ?? '',
    count: raw.count ?? 0,
    taxonomy,
  };
}

export function extractEmbeddedTerms(raw: any, taxonomy: string): WPTerm[] {
  const groups = raw._embedded?.['wp:term'] as any[][] | undefined;
  if (!groups) return [];
  return groups
    .flat()
    .filter((term) => term && term.taxonomy === taxonomy)
    .map((term) => mapRawTerm(term, taxonomy));
}
