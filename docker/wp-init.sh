#!/usr/bin/env bash
# One-time setup for the docker-compose.yml stack: installs WordPress core,
# switches on pretty permalinks (the REST API needs these for clean URLs),
# installs Yoast SEO, and generates sample content — including the `event`
# custom post type and `primary` nav menu location registered by
# mu-plugins/wp-next-adapter-demo.php — so every feature this package
# supports (posts, pages, a custom post type, menus, search, Yoast SEO) has
# something real to fetch immediately after this script finishes.
#
# Run after `docker compose up -d`. Safe to re-run — `wp core install`
# and `wp plugin install --activate` are both no-ops if already done.
set -euo pipefail
cd "$(dirname "$0")"

SITE_URL="http://localhost:8080"

wp() {
  docker compose run --rm wpcli wp "$@"
}

echo "Waiting for WordPress's web server to respond..."
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "$SITE_URL/wp-login.php"; then
    break
  fi
  sleep 2
done

if ! curl -sf -o /dev/null "$SITE_URL/wp-login.php"; then
  echo "WordPress never became reachable at $SITE_URL — check 'docker compose logs wordpress'." >&2
  exit 1
fi

if wp core is-installed 2>/dev/null; then
  echo "WordPress core already installed, skipping."
else
  echo "Installing WordPress core..."
  wp core install \
    --url="$SITE_URL" \
    --title="wp-next-adapter demo" \
    --admin_user="admin" \
    --admin_password="admin" \
    --admin_email="admin@example.com" \
    --skip-email
fi

echo "Setting pretty permalinks (required for clean REST API URLs)..."
wp rewrite structure '/%postname%/' --hard

if wp plugin is-installed wordpress-seo 2>/dev/null; then
  echo "Yoast SEO already installed, skipping."
else
  echo "Installing and activating Yoast SEO..."
  wp plugin install wordpress-seo --activate
fi

echo "Generating sample content (posts, pages, events)..."
wp post generate --count=5 --post_type=post
wp post generate --count=3 --post_type=page
wp post generate --count=3 --post_type=event

echo "Creating and assigning the primary nav menu..."
if ! wp menu list --fields=name --format=csv | grep -qx "Primary Menu"; then
  wp menu create "Primary Menu"
fi
wp menu location assign "primary-menu" primary || true
FIRST_POST_ID=$(wp post list --post_type=post --field=ID --posts_per_page=1 | tr -d '[:space:]')
if [ -n "$FIRST_POST_ID" ]; then
  wp menu item add-post "primary-menu" "$FIRST_POST_ID" || true
fi

cat <<EOF

Done.
  Site:      $SITE_URL
  Admin:     $SITE_URL/wp-admin  (admin / admin — this is a throwaway local demo, not for production use)
  REST API:  $SITE_URL/wp-json/wp/v2/posts

Point this package at it:
  createWPClient({ baseUrl: '$SITE_URL' })
EOF
