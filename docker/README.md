# Local WordPress + MySQL demo stack

A disposable WordPress site for developing and testing `mentonext`
against real REST API responses, instead of only mocked `fetch` calls.

## Quickstart

```bash
cd docker
docker compose up -d
./wp-init.sh
```

`wp-init.sh` waits for WordPress to come up, then installs WordPress core,
switches on pretty permalinks (required for clean REST URLs), installs and
activates Yoast SEO, generates sample posts/pages/events, and sets up a
primary nav menu. It's safe to re-run.

Once it finishes:

- Site: http://localhost:8080
- Admin: http://localhost:8080/wp-admin (`admin` / `admin` — a throwaway
  local login, not meant to be exposed or reused anywhere real)
- REST API: http://localhost:8080/wp-json/wp/v2/posts

```ts
import { createWPClient } from 'mentonext';
const wp = createWPClient({ baseUrl: 'http://localhost:8080' });
```

## What's set up, and why

| Feature under test              | How this stack provides it                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| Posts / pages                    | `wp post generate` sample content                                                        |
| Custom post type                 | An `event` CPT (`rest_base: events`), registered by `mu-plugins/mentonext-demo.php` |
| Categories / tags                | WordPress's own defaults + generated sample posts                                        |
| Yoast SEO (`source: 'yoast'`)    | Installed and activated by `wp-init.sh`                                                  |
| Menus (`getMenu`/`useMenu`)      | A `primary` nav menu location, registered by the same mu-plugin, plus the `rest_menu_read_access` filter turned on (the WordPress 6.8+ opt-in this package's menu support documents) |
| Search (`search`/`useSearch`)    | WordPress's built-in `/wp/v2/search`, works against any content already present          |
| Cache invalidation webhook       | Not wired up here (would need a real Next.js app as the receiving end) — see the main README's webhook section to add it yourself |

RankMath and AIOSEO aren't installed by this script — install and configure
them yourself via `wp-admin` (RankMath specifically needs its **Headless
CMS Support** setting turned on manually; see the main README) if you want
to exercise those integrations against this stack.

## Tearing down

```bash
docker compose down        # stop containers, keep the database/files
docker compose down -v     # also delete the volumes (start completely fresh)
```

## Troubleshooting

- **`wp-init.sh` hangs on "Waiting for WordPress..."** — check
  `docker compose logs wordpress` and `docker compose logs db`; the most
  common cause is MySQL still initializing on first run (it can take longer
  than WordPress's own crash-loop-and-retry startup).
- **Image pulls fail (e.g. `403 Forbidden` from a registry)** — this means
  wherever you're running this has restricted/no access to Docker Hub. That's
  an environment/network policy issue, not a problem with this compose file;
  run it somewhere with normal Docker Hub access.
