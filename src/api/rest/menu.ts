import { RestClient } from './client';
import { WPMenuItem } from '../../types';
import { WPApiError, WPNotFoundError, WPMenuAccessError } from '../../utils/errors';

interface RawMenuLocation {
  name: string;
  description: string;
  menu: number;
}

interface RawMenuItem {
  id: number;
  title: { rendered: string };
  url: string;
  parent: number;
  menu_order: number;
  target: string;
  classes: string[];
}

function mapRawMenuItem(raw: RawMenuItem): WPMenuItem {
  return {
    id: raw.id,
    title: raw.title?.rendered ?? '',
    url: raw.url ?? '',
    parentId: raw.parent ?? 0,
    order: raw.menu_order ?? 0,
    target: raw.target ?? '',
    classes: raw.classes ?? [],
    children: [],
  };
}

function buildMenuTree(items: WPMenuItem[]): WPMenuItem[] {
  const byId = new Map(items.map((item) => [item.id, { ...item, children: [] as WPMenuItem[] }]));
  const roots: WPMenuItem[] = [];

  for (const item of byId.values()) {
    const parent = item.parentId ? byId.get(item.parentId) : undefined;
    if (parent) {
      parent.children.push(item);
    } else {
      roots.push(item);
    }
  }

  const sortByOrder = (list: WPMenuItem[]): void => {
    list.sort((a, b) => a.order - b.order);
    list.forEach((child) => sortByOrder(child.children));
  };
  sortByOrder(roots);

  return roots;
}

function toMenuAccessError(err: unknown): unknown {
  if (err instanceof WPApiError && (err.status === 401 || err.status === 403)) {
    return new WPMenuAccessError(
      'WordPress blocked this menu request. Menu REST endpoints are not public by default — ' +
        "add add_filter('rest_menu_read_access', '__return_true'); to your WordPress site " +
        '(requires WordPress 6.8+), or authenticate the request yourself.'
    );
  }
  return err;
}

/**
 * Fetches a WordPress navigation menu by its registered theme location
 * (e.g. "primary", "footer") or by a direct numeric menu ID, returned as a
 * nested tree (each item has a `children` array, sorted by menu order).
 *
 * IMPORTANT — WordPress-side requirement, same shape of gotcha as
 * RankMath's headless setting: menu REST endpoints are NOT public by
 * default. As of WordPress 6.8, a site can opt in with:
 *
 *   add_filter('rest_menu_read_access', '__return_true');
 *
 * Sites on older WordPress versions have no way to expose this publicly at
 * all without a plugin or custom REST permission callback. Without it,
 * this throws WPMenuAccessError (distinguishable from "menu not found")
 * rather than a generic network error.
 *
 * Limitation: fetches up to 100 items per menu in one request — more than
 * enough for a typical nav menu, but a menu larger than that would need
 * pagination this function doesn't implement.
 */
export async function fetchMenu(client: RestClient, locationOrId: string | number): Promise<WPMenuItem[]> {
  let menuId: number;

  if (typeof locationOrId === 'number' || /^\d+$/.test(locationOrId)) {
    menuId = Number(locationOrId);
  } else {
    let locations: Record<string, RawMenuLocation>;
    try {
      locations = await client.get<Record<string, RawMenuLocation>>('/menu-locations');
    } catch (err) {
      throw toMenuAccessError(err);
    }
    const location = locations[locationOrId];
    if (!location) {
      throw new WPNotFoundError(`Menu location not found: "${locationOrId}"`);
    }
    menuId = location.menu;
  }

  let items: RawMenuItem[];
  try {
    items = await client.get<RawMenuItem[]>('/menu-items', {
      menus: String(menuId),
      per_page: '100',
      orderby: 'menu_order',
      order: 'asc',
    });
  } catch (err) {
    throw toMenuAccessError(err);
  }

  return buildMenuTree(items.map(mapRawMenuItem));
}
