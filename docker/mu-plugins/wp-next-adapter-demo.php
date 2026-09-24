<?php
/**
 * Plugin Name: wp-next-adapter demo helpers
 * Description: Registers a demo custom post type and a nav menu location,
 * and opts into WordPress 6.8's rest_menu_read_access filter, so this
 * package's customPostType()/getMenu() (and their useCustomPostType/useMenu
 * hooks) can be exercised end-to-end against this stack without needing any
 * extra plugin installed. Mounted as a must-use plugin (always active, no
 * activation step) via the docker-compose.yml bind mount.
 */

add_action('init', function () {
    register_post_type('event', [
        'labels' => ['name' => 'Events', 'singular_name' => 'Event'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'events',
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail'],
        'has_archive' => true,
    ]);

    register_nav_menu('primary', 'Primary Menu');
});

// Menu REST endpoints are not public by default (WordPress 6.8+) — this is
// the exact opt-in documented in src/api/rest/menu.ts's WPMenuAccessError
// message. Enabled here so the demo's getMenu()/useMenu() work immediately
// rather than requiring a manual step just to see the feature run.
add_filter('rest_menu_read_access', '__return_true');
