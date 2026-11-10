<?php
/**
 * Plugin Name: BOS Lessons
 * Plugin URI:  https://bos.work/plugin
 * Description: Sell video and audio lessons from your WordPress site. Embeds your BOS lesson library ([bos_lessons_app]), shows program pages ([bos_lessons_program], [bos_lessons_programs]) and opens programs bought through WooCommerce.
 * Version:     1.0.4
 * Author:      IQDesk
 * Author URI:  https://bos.work
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: bos-lessons
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

const BOS_LESSONS_VERSION = '1.0.4';
const BOS_LESSONS_OPTION  = 'bos_lessons';

// Only these API endpoints can be reached through the proxy.
const BOS_LESSONS_ENDPOINTS = [
    'GET'  => ['data', 'getInfo', 'getLessons', 'getRelatedLessons', 'getCourse', 'getCourses', 'getPackages', 'getPositions', 'getBodyAreas'],
    'POST' => ['login', 'user', 'verifyCode', 'forgotPassword', 'loginKey', 'setPassword', 'startCourse', 'addFavorite', 'removeFavorite', 'resetPackagePosition', 'addFavoritePackage', 'removeFavoritePackage'],
];

/* ---------- Settings ---------- */

/**
 * Settings, with wp-config.php constants as fallbacks (BOS_LESSONS_API_KEY, BOS_LESSONS_API_URL;
 * the SIM_APP_WOO_SECRET / SIM_APP_API names used before the first public release still work).
 */
function bos_lessons_settings() {
    static $settings = null;
    if ($settings !== null) {
        return $settings;
    }
    $stored   = (array) get_option(BOS_LESSONS_OPTION, []);
    $settings = [
        'api_key'  => trim((string) ($stored['api_key'] ?? '')),
        'api_url'  => trim((string) ($stored['api_url'] ?? '')),
        'shop_url' => trim((string) ($stored['shop_url'] ?? '')),
        'logo_url' => trim((string) ($stored['logo_url'] ?? '')),
    ];
    foreach (['api_key' => ['BOS_LESSONS_API_KEY', 'SIM_APP_WOO_SECRET'], 'api_url' => ['BOS_LESSONS_API_URL', 'SIM_APP_API']] as $key => $constants) {
        foreach ($constants as $constant) {
            if ($settings[$key] === '' && defined($constant)) {
                $settings[$key] = trim((string) constant($constant));
            }
        }
    }
    if ($settings['api_url'] === '') {
        $settings['api_url'] = 'https://api.bos.work/app/api/rest/';
    }
    $settings['api_url'] = trailingslashit($settings['api_url']);
    return $settings;
}

// The API key: "<company id>.<secret>". The secret signs server-to-server calls; the company id selects the account.
function bos_lessons_api_key() {
    return bos_lessons_settings()['api_key'];
}

function bos_lessons_company_id() {
    $key = bos_lessons_api_key();
    $dot = strpos($key, '.');
    return $dot === false ? 0 : (int) substr($key, 0, $dot);
}

function bos_lessons_api_secret() {
    $key = bos_lessons_api_key();
    $dot = strpos($key, '.');
    return $dot === false ? $key : substr($key, $dot + 1);
}

function bos_lessons_api_url() {
    return bos_lessons_settings()['api_url'];
}

// Logo on the sign-in screens: the setting, else the theme's site logo, else the site icon, else none.
function bos_lessons_logo_url() {
    $url = bos_lessons_settings()['logo_url'];
    if ($url === '' && ($logo_id = (int) get_theme_mod('custom_logo'))) {
        $url = (string) wp_get_attachment_image_url($logo_id, 'medium');
    }
    if ($url === '') {
        $url = (string) get_site_icon_url(256);
    }
    return $url;
}

// Where "All programs" links go: the setting, else the page that holds [bos_lessons_program(s)].
function bos_lessons_shop_url() {
    $url = bos_lessons_settings()['shop_url'];
    return $url !== '' ? $url : home_url('/' . (defined('BOS_LESSONS_PROGRAM_PAGE') ? BOS_LESSONS_PROGRAM_PAGE : 'program') . '/');
}

add_action('admin_menu', function () {
    add_options_page(__('BOS Lessons', 'bos-lessons'), __('BOS Lessons', 'bos-lessons'), 'manage_options', 'bos-lessons', 'bos_lessons_settings_page');
});

add_action('admin_init', function () {
    register_setting('bos_lessons', BOS_LESSONS_OPTION, [
        'type'              => 'array',
        'sanitize_callback' => function ($input) {
            $input = is_array($input) ? $input : [];
            $clean = [
                'api_key'  => preg_replace('/[^A-Za-z0-9._\-]/', '', (string) ($input['api_key'] ?? '')),
                'api_url'  => esc_url_raw(trim((string) ($input['api_url'] ?? ''))),
                'shop_url' => esc_url_raw(trim((string) ($input['shop_url'] ?? ''))),
                'logo_url' => esc_url_raw(trim((string) ($input['logo_url'] ?? ''))),
            ];
            delete_transient('bos_lessons_packages');
            delete_transient('bos_lessons_page_url');
            return $clean;
        },
    ]);
    add_settings_section('bos_lessons_main', '', '__return_false', 'bos-lessons');
    $fields = [
        'api_key'  => [__('API key', 'bos-lessons'), __('From your BOS dashboard (Settings → WordPress). Required.', 'bos-lessons'), 'text'],
        'shop_url' => [__('Programs page URL', 'bos-lessons'), __('Where "All programs" links go. Leave empty to use the page that holds [bos_lessons_programs].', 'bos-lessons'), 'url'],
        'logo_url' => [__('Logo URL', 'bos-lessons'), __('Shown above the sign-in form. Leave empty to use your site logo or site icon.', 'bos-lessons'), 'url'],
        'api_url'  => [__('API URL', 'bos-lessons'), __('Leave empty unless BOS support gave you a different address.', 'bos-lessons'), 'url'],
    ];
    foreach ($fields as $key => [$label, $help, $type]) {
        add_settings_field('bos_lessons_' . $key, $label, function () use ($key, $help, $type) {
            $stored = (array) get_option(BOS_LESSONS_OPTION, []);
            printf(
                '<input type="%s" class="regular-text" name="%s[%s]" value="%s" autocomplete="off"><p class="description">%s</p>',
                esc_attr($type),
                esc_attr(BOS_LESSONS_OPTION),
                esc_attr($key),
                esc_attr($stored[$key] ?? ''),
                esc_html($help)
            );
        }, 'bos-lessons', 'bos_lessons_main');
    }
});

function bos_lessons_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }
    $status = bos_lessons_api_key() === ''
        ? '<div class="notice notice-warning inline"><p>' . esc_html__('Enter your API key to connect this site to BOS.', 'bos-lessons') . '</p></div>'
        /* translators: %d: BOS account number */
        : '<div class="notice notice-success inline"><p>' . sprintf(esc_html__('Connected to BOS account #%d.', 'bos-lessons'), bos_lessons_company_id()) . '</p></div>';
    echo '<div class="wrap"><h1>' . esc_html__('BOS Lessons', 'bos-lessons') . '</h1>' . wp_kses_post($status) . '<form method="post" action="options.php">';
    settings_fields('bos_lessons');
    do_settings_sections('bos-lessons');
    submit_button();
    echo '</form><h2>' . esc_html__('Shortcodes', 'bos-lessons') . '</h2><ul>'
        . '<li><code>[bos_lessons_app]</code> — ' . esc_html__('the lesson library and player (one page).', 'bos-lessons') . '</li>'
        . '<li><code>[bos_lessons_programs]</code> — ' . esc_html__('all programs with price and Buy Now.', 'bos-lessons') . '</li>'
        . '<li><code>[bos_lessons_program id="12"]</code> — ' . esc_html__('one program page; without an id, the program linked to the current WooCommerce product.', 'bos-lessons') . '</li>'
        . '</ul></div>';
}

add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($links) {
    array_unshift($links, '<a href="' . esc_url(admin_url('options-general.php?page=bos-lessons')) . '">' . esc_html__('Settings', 'bos-lessons') . '</a>');
    return $links;
});

/* ---------- Modules ---------- */

add_action('plugins_loaded', function () {
    // WooCommerce purchases -> programs in the app.
    if (class_exists('WooCommerce')) {
        require_once __DIR__ . '/includes/woocommerce.php';
    }
});
add_action('before_woocommerce_init', function () {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});

/* ---------- REST proxy ---------- */

/**
 * /wp-json/bos-lessons/v1/proxy/<endpoint>
 * The BOS API sends no CORS headers, so the browser calls WordPress and WordPress calls BOS.
 * The account's API key goes along as a header; the endpoints authenticate the student with their own token.
 */
add_action('rest_api_init', function () {
    register_rest_route('bos-lessons/v1', '/proxy/(?P<endpoint>[A-Za-z]+)', [
        'methods'             => ['GET', 'POST'],
        'permission_callback' => '__return_true',
        'callback'            => 'bos_lessons_proxy',
    ]);
});

function bos_lessons_proxy(WP_REST_Request $request) {
    $method   = $request->get_method();
    $endpoint = $request->get_param('endpoint');

    if (!in_array($endpoint, BOS_LESSONS_ENDPOINTS[$method] ?? [], true)) {
        return new WP_REST_Response(['error' => 'Endpoint not allowed'], 403);
    }
    if (bos_lessons_api_key() === '') {
        return new WP_REST_Response(['error' => 'BOS Lessons is not connected: add the API key in Settings → BOS Lessons'], 503);
    }

    $args = [
        'timeout'    => 20,
        'user-agent' => 'Mozilla/5.0 (BOS Lessons WordPress; ' . home_url() . ')',
        'headers'    => ['X-Bos-Key' => bos_lessons_api_key()],
    ];

    if ($method === 'GET') {
        $query = $request->get_query_params();
        unset($query['rest_route']);
        $response = wp_remote_get(add_query_arg(array_map('rawurlencode', $query), bos_lessons_api_url() . $endpoint), $args);
    } else {
        $args['body'] = $request->get_body_params();
        $response     = wp_remote_post(bos_lessons_api_url() . $endpoint, $args);
    }

    if (is_wp_error($response)) {
        return new WP_REST_Response(['error' => 'Upstream unavailable'], 502);
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    $out  = new WP_REST_Response($body ?? ['error' => 'Invalid upstream response'], wp_remote_retrieve_response_code($response) ?: 502);
    $out->header('Cache-Control', 'no-store');
    return $out;
}

/* ---------- [bos_lessons_app] ---------- */

function bos_lessons_app_shortcode() {
    if (bos_lessons_api_key() === '') {
        return current_user_can('manage_options')
            ? '<p><strong>BOS Lessons:</strong> ' . sprintf(
                /* translators: %s: settings page link */
                esc_html__('add your API key in %s to show the lessons here.', 'bos-lessons'),
                '<a href="' . esc_url(admin_url('options-general.php?page=bos-lessons')) . '">' . esc_html__('Settings → BOS Lessons', 'bos-lessons') . '</a>'
            ) . '</p>'
            : '';
    }
    $base = plugin_dir_url(__FILE__) . 'app/';
    $ver  = BOS_LESSONS_VERSION;

    wp_enqueue_style('bos-lessons', $base . 'bos-lessons.css', [], $ver);
    wp_enqueue_script('bos-lessons', $base . 'bos-lessons.js', [], $ver, true);
    wp_add_inline_script('bos-lessons', 'window.BOS_LESSONS = ' . wp_json_encode([
        'apiBase'         => rest_url('bos-lessons/v1/proxy/'),
        'assetsUrl'       => $base,
        'companyId'       => (string) bos_lessons_company_id(),
        'siteName'        => get_bloginfo('name'),
        'logoUrl'         => bos_lessons_logo_url(),
        // Locked programs link to their program page.
        'packageProducts' => function_exists('bos_lessons_package_products') ? bos_lessons_package_products() : new stdClass(),
        'shopUrl'         => bos_lessons_shop_url(),
    ]) . ';', 'before');

    return '<div id="bos-app"></div>';
}
add_shortcode('bos_lessons_app', 'bos_lessons_app_shortcode');

// The Vite bundle is an ES module.
add_filter('script_loader_tag', function ($tag, $handle) {
    if ($handle === 'bos-lessons') {
        $tag = str_replace('<script ', '<script type="module" ', $tag);
    }
    return $tag;
}, 10, 2);
