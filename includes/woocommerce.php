<?php
/**
 * WooCommerce <-> programs in the app.
 *
 * - Product edit screen: "Program in the app" (meta _bos_program_id), picked from the account's programs.
 * - Paid / completed order: grants the bought programs to the billing email (BOS creates the student account if needed).
 * - Refunded / cancelled order: revokes them.
 * - [bos_program] shortcode: the program page from BOS, so it is not typed twice on the product page.
 *
 * Server-to-server calls to BOS rest/woo are signed (HMAC) with the secret part of the API key.
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/package-page.php';
require_once __DIR__ . '/programs.php';
const BOS_LESSONS_PROGRAM_META = '_bos_program_id';

// Legacy product meta from the Sense in Motion plugin is still read.
function bos_lessons_product_program_id($product_id) {
    $id = bos_lessons_product_program_id($product_id);
    return $id !== '' ? $id : get_post_meta($product_id, '_sim_package_id', true);
}

// Fingerprint of the secret (never the secret), shown in error notes so support can compare keys.
function bos_lessons_secret_fingerprint() {
    $secret = bos_lessons_api_secret();
    return $secret === '' ? 'none' : strlen($secret) . ' chars, fingerprint ' . substr(hash('sha256', $secret), 0, 8);
}

/**
 * Signed call to BOS rest/woo. Returns the decoded body, or WP_Error.
 */
function bos_lessons_woo_call(array $payload) {
    $secret = bos_lessons_api_secret();
    if (strlen($secret) < 32) {
        return new WP_Error('bos_no_key', __('The BOS API key is missing. Add it in Settings → BOS Lessons.', 'bos-lessons'));
    }
    // app_url: where BOS points its "set your password" links (the page holding [bos_app]).
    $body      = wp_json_encode($payload + ['company_id' => bos_lessons_company_id(), 'app_url' => bos_lessons_page_url()]);
    $timestamp = (string) time();
    $response  = wp_remote_post(bos_lessons_api_url() . 'woo', [
        'timeout'    => 20,
        'user-agent' => 'Mozilla/5.0 (BOS Lessons WordPress; ' . home_url() . ')',
        'headers'    => [
            'Content-Type'    => 'application/json',
            'X-Bos-Key'       => bos_lessons_api_key(),
            'X-Bos-Timestamp' => $timestamp,
            'X-Bos-Signature' => hash_hmac('sha256', $timestamp . '.' . $body, $secret),
        ],
        'body'       => $body,
    ]);
    if (is_wp_error($response)) {
        return $response;
    }
    $code = wp_remote_retrieve_response_code($response);
    $data = json_decode(wp_remote_retrieve_body($response), true);
    if ($code !== 200 || !is_array($data)) {
        $why = is_array($data) && !empty($data['reason']) ? $data['reason'] : wp_strip_all_tags(substr(wp_remote_retrieve_body($response), 0, 200));
        return new WP_Error('bos_api', 'BOS responded ' . $code . ': ' . $why . ' — WordPress secret: ' . bos_lessons_secret_fingerprint() . '.');
    }
    return $data;
}

function bos_lessons_packages() {
    $cached = get_transient('bos_lessons_packages');
    if (is_array($cached)) {
        return $cached;
    }
    $data = bos_lessons_woo_call(['action' => 'packages']);
    if (is_wp_error($data)) {
        return $data;
    }
    $packages = $data['packages'] ?? [];
    set_transient('bos_lessons_packages', $packages, 10 * MINUTE_IN_SECONDS);
    return $packages;
}

function bos_lessons_package($package_id) {
    $key    = 'bos_lessons_package_' . (int) $package_id;
    // Editors always get fresh content, so changes made in BOS show up right away.
    $cached = current_user_can('edit_posts') ? false : get_transient($key);
    if (is_array($cached)) {
        return $cached;
    }
    $data = bos_lessons_woo_call(['action' => 'package', 'package_id' => (string) (int) $package_id]);
    if (is_wp_error($data)) {
        return $data;
    }
    if (empty($data['package'])) {
        return new WP_Error('bos_no_program', 'BOS has no active program with id ' . (int) $package_id . '.');
    }
    set_transient($key, $data['package'], 15 * MINUTE_IN_SECONDS);
    return $data['package'];
}

/* ---------- Product field ---------- */

add_action('woocommerce_product_options_general_product_data', function () {
    global $post;
    $current  = bos_lessons_product_program_id($post->ID);
    $packages = bos_lessons_packages();
    echo '<div class="options_group">';
    if (is_wp_error($packages)) {
        echo '<p class="form-field"><strong>Program in the app:</strong> ' . esc_html($packages->get_error_message()) . '</p>';
        if ($current) {
            echo '<input type="hidden" name="' . esc_attr(BOS_LESSONS_PROGRAM_META) . '" value="' . esc_attr($current) . '">';
        }
    } else {
        $options = ['' => __('— Not an app program —', 'bos-lessons')];
        foreach ($packages as $package) {
            $options[$package['id']] = sprintf('%s (%d lessons)', $package['name'], $package['lesson_count']);
        }
        woocommerce_wp_select([
            'id'          => BOS_LESSONS_PROGRAM_META,
            'label'       => __('Program in the app', 'bos-lessons'),
            'options'     => $options,
            'value'       => $current,
            'desc_tip'    => true,
            'description' => __('Buying this product opens this program in the app for the customer’s email.', 'bos-lessons'),
        ]);
    }
    echo '</div>';
});

add_action('woocommerce_process_product_meta', function ($product_id) {
    if (!isset($_POST[BOS_LESSONS_PROGRAM_META])) {
        return;
    }
    $value = sanitize_text_field(wp_unslash($_POST[BOS_LESSONS_PROGRAM_META]));
    if ($value === '') {
        delete_post_meta($product_id, BOS_LESSONS_PROGRAM_META);
    } elseif (ctype_digit($value)) {
        update_post_meta($product_id, BOS_LESSONS_PROGRAM_META, $value);
    }
});

/* ---------- Orders ---------- */

function bos_lessons_order_granted(WC_Order $order) {
    return $order->get_meta('_bos_granted') === 'yes' || $order->get_meta('_sim_granted') === 'yes';
}

function bos_lessons_order_package_ids(WC_Order $order) {
    $ids = [];
    foreach ($order->get_items() as $item) {
        $product_id = $item->get_product_id(); // parent for variations
        $package_id = bos_lessons_product_program_id($product_id);
        if ($package_id !== '' && ctype_digit((string) $package_id)) {
            $ids[] = (string) $package_id;
        }
    }
    return array_values(array_unique($ids));
}

function bos_lessons_grant_order($order_id, $force = false) {
    $order = wc_get_order($order_id);
    if (!$order || (!$force && bos_lessons_order_granted($order))) {
        return;
    }
    $package_ids = bos_lessons_order_package_ids($order);
    if (!$package_ids) {
        return;
    }
    $result = bos_lessons_woo_call([
        'action'      => 'grant',
        'email'       => $order->get_billing_email(),
        'full_name'   => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
        'order_id'    => (string) $order->get_id(),
        'package_ids' => $package_ids,
    ]);
    if (is_wp_error($result)) {
        $order->add_order_note('App programs NOT opened: ' . $result->get_error_message() . ' Use the order action "Open programs in the app" to retry.');
        return;
    }
    $order->update_meta_data('_bos_granted', 'yes');
    if (!empty($result['login_key'])) {
        // Signs the buyer in on the website from the thank-you page (bos_lessons_checkout_redirect); used once.
        $order->update_meta_data('_bos_login_key', sanitize_text_field($result['login_key']));
    }
    $order->save();
    $order->add_order_note(sprintf(
        'App programs opened for %s%s.',
        $order->get_billing_email(),
        !empty($result['created']) ? ' (new app account created, "set your password" email sent)' : ''
    ));
}

/**
 * Right after checkout: open the bought program in the website app, signed in as the buyer
 * (a new account gets a "set your password" popup there). Falls back to the thank-you page.
 */
function bos_lessons_checkout_redirect() {
    if (!function_exists('is_order_received_page') || !is_order_received_page()) {
        return;
    }
    $order_id = absint(get_query_var('order-received'));
    $order    = $order_id ? wc_get_order($order_id) : null;
    $key      = isset($_GET['key']) ? sanitize_text_field(wp_unslash($_GET['key'])) : '';
    if (!$order || !$key || !hash_equals($order->get_order_key(), $key)) {
        return;
    }
    $package_ids = bos_lessons_order_package_ids($order);
    $app_url     = bos_lessons_page_url();
    if (!$package_ids || !$app_url) {
        return;
    }
    // Paid but the status hook has not opened the program yet (gateway callback still pending): open it now.
    if (!bos_lessons_order_granted($order) && $order->is_paid()) {
        bos_lessons_grant_order($order->get_id());
        $order = wc_get_order($order->get_id());
    }
    $login_key = $order->get_meta('_bos_login_key');
    if (!$login_key) {
        return;
    }
    $order->delete_meta_data('_bos_login_key');
    $order->save();
    wp_safe_redirect($app_url . '#/program/' . (int) $package_ids[0] . '?key=' . rawurlencode($login_key));
    exit;
}
add_action('template_redirect', 'bos_lessons_checkout_redirect', 5);

add_action('woocommerce_order_status_processing', 'bos_lessons_grant_order');
add_action('woocommerce_order_status_completed', 'bos_lessons_grant_order');

function bos_lessons_revoke_order($order_id) {
    $order = wc_get_order($order_id);
    if (!$order || !bos_lessons_order_granted($order)) {
        return;
    }
    $result = bos_lessons_woo_call(['action' => 'revoke', 'order_id' => (string) $order->get_id()]);
    if (is_wp_error($result)) {
        $order->add_order_note('App programs NOT closed: ' . $result->get_error_message());
        return;
    }
    $order->delete_meta_data('_bos_granted');
    $order->delete_meta_data('_sim_granted');
    $order->save();
    $order->add_order_note('App programs closed (order refunded/cancelled).');
}

add_action('woocommerce_order_status_refunded', 'bos_lessons_revoke_order');
add_action('woocommerce_order_status_cancelled', 'bos_lessons_revoke_order');

// Manual retry from the order screen.
add_filter('woocommerce_order_actions', function ($actions) {
    $actions['bos_lessons_grant'] = __('Open programs in the app', 'bos-lessons');
    return $actions;
});
add_action('woocommerce_order_action_bos_lessons_grant', function ($order) {
    bos_lessons_grant_order($order->get_id(), true);
});

// Thank-you page: a box at the top with a clear button to the program (shown when the checkout redirect did not happen).
function bos_lessons_thankyou_box($order) {
    static $shown = false;
    if ($shown || !$order || !($package_ids = bos_lessons_order_package_ids($order))) {
        return '';
    }
    $shown   = true;
    $app_url = bos_lessons_page_url();
    $open    = $app_url ? $app_url . '#/program/' . (int) $package_ids[0] : bos_lessons_shop_url();
    return '<section class="bos-thankyou" style="margin:0 0 32px;padding:28px 32px;border:2px solid #688f31;border-radius:16px;background:#fff">'
        . '<h2 style="margin:0 0 8px;color:#688f31;font-weight:700">' . esc_html__('Your program is ready', 'bos-lessons') . '</h2>'
        . '<p style="margin:0 0 20px">' . sprintf(/* translators: %s: buyer email */ esc_html__('Sign in with %s on this website or in the app.', 'bos-lessons'), '<strong>' . esc_html($order->get_billing_email()) . '</strong>') . ' '
        . esc_html__('New here? We emailed you a link to choose your password.', 'bos-lessons') . '</p>'
        . '<a href="' . esc_url($open) . '" style="display:inline-block;padding:16px 32px;border-radius:8px;background:oklch(0.902 0.163 128);color:oklch(0.22 0.03 265);font-weight:700;font-size:1.1rem;text-decoration:none;box-shadow:0 6px 18px -10px rgba(0,0,0,.6)">' . esc_html__('Open my program', 'bos-lessons') . ' &rarr;</a>'
        . '</section>';
}

// The order shown on the order-received page (key checked, as WooCommerce does).
function bos_lessons_received_order() {
    $order_id = absint(get_query_var('order-received'));
    $order    = $order_id ? wc_get_order($order_id) : null;
    $key      = isset($_GET['key']) ? sanitize_text_field(wp_unslash($_GET['key'])) : '';
    return $order && $key && hash_equals($order->get_order_key(), $key) ? $order : null;
}

// Classic thank-you template: top of the page.
add_action('woocommerce_before_thankyou', function ($order_id) {
    echo bos_lessons_thankyou_box(wc_get_order($order_id));
});

// Block order-confirmation template (block themes): right after the status block at the top.
add_filter('render_block_woocommerce/order-confirmation-status', function ($html) {
    return $html . bos_lessons_thankyou_box(bos_lessons_received_order());
});

/* ---------- Product page content ---------- */

/**
 * [bos_program] (current product's program) or [bos_program id="12"]:
 * - the program page from the BOS "Page on the website" blocks, followed by the "Extra content" (web_description);
 * - else the "Website description" alone; else the lesson list. show="lessons" forces the list.
 */
function bos_lessons_program_shortcode($atts) {
    $atts       = shortcode_atts(['id' => '', 'show' => 'auto'], $atts);
    $package_id = $atts['id'] !== '' ? $atts['id'] : bos_lessons_current_program_id();
    if (!ctype_digit((string) $package_id) && get_post_field('post_name', get_the_ID()) === BOS_LESSONS_PROGRAM_PAGE) {
        return do_shortcode('[bos_programs]'); // the bare /program/ page: list the programs to choose from
    }
    if (!ctype_digit((string) $package_id)) {
        return bos_lessons_editor_notice('Which program? On a regular page use [bos_program id="…"] with the program number from your BOS dashboard. Without an id it only works on a WooCommerce product linked to a program.');
    }
    $package = bos_lessons_package($package_id);
    if (is_wp_error($package)) {
        return bos_lessons_editor_notice('Could not load program ' . (int) $package_id . ' from BOS: ' . esc_html($package->get_error_message()));
    }
    $extra = trim(wp_strip_all_tags($package['web_description'] ?? '', true)) !== ''
        ? '<div class="bos-package-description">' . wp_kses_post($package['web_description']) . '</div>'
        : '';
    $page = is_array($package['web_page'] ?? null) ? $package['web_page'] + ['eyebrow' => '', 'title' => '', 'subtitle' => '', 'intro' => '', 'note' => '', 'image' => '', 'inside_title' => '', 'items' => []] : null;
    if ($atts['show'] !== 'lessons' && $page && ($page['title'] !== '' || $page['intro'] !== '' || !empty($page['items']))) {
        return bos_lessons_render_package_page($package, $page) . $extra;
    }
    if ($atts['show'] !== 'lessons' && $extra !== '') {
        return bos_lessons_buy_box($package) . $extra;
    }
    if (empty($package['lessons'])) {
        return bos_lessons_editor_notice('Program ' . (int) $package_id . ' has no page blocks, website description or lessons yet. Fill "Page on the website" in BOS.');
    }
    $html = bos_lessons_buy_box($package) . '<ol class="bos-package-lessons" style="padding-left:1.2em">';
    foreach ($package['lessons'] as $i => $lesson) {
        $html .= '<li style="margin-bottom:1em"><strong>' . esc_html($lesson['lesson_name']) . '</strong>';
        if (!empty($lesson['description'])) {
            $html .= '<br>' . nl2br(esc_html($lesson['description']));
        }
        $html .= '</li>';
    }
    return $html . '</ol>';
}
add_shortcode('bos_program', 'bos_lessons_program_shortcode');
add_shortcode('sim_package', 'bos_lessons_program_shortcode'); // legacy name

// Refresh the cached program content when a product is saved.
add_action('save_post_product', function ($post_id) {
    delete_transient('bos_lessons_packages');
    $package_id = bos_lessons_product_program_id($post_id);
    if ($package_id) {
        delete_transient('bos_lessons_package_' . (int) $package_id);
    }
});

/* ---------- Helpers ---------- */

// Explains an empty [bos_program] to logged-in editors only; visitors see nothing.
function bos_lessons_editor_notice($message) {
    if (!current_user_can('edit_posts')) {
        return '';
    }
    return '<div style="border:2px dashed #c0392b;border-radius:8px;padding:12px 16px;margin:16px 0;background:#fdecea;color:#7a1d12;font-size:15px">'
        . '<strong>[bos_program] (visible to editors only):</strong> ' . wp_kses($message, ['b' => []]) . '</div>';
}

/* ---------- Helpers for the web app ---------- */

// URL of the page that holds [bos_app], for links back to the app.
function bos_lessons_page_url() {
    $url = get_transient('bos_lessons_page_url');
    if ($url === false) {
        $pages = get_posts(['post_type' => 'page', 'post_status' => 'publish', 's' => '[bos_app]', 'numberposts' => 1, 'fields' => 'ids'])
            ?: get_posts(['post_type' => 'page', 'post_status' => 'publish', 's' => '[sim_app]', 'numberposts' => 1, 'fields' => 'ids']);
        $url   = $pages ? get_permalink($pages[0]) : '';
        set_transient('bos_lessons_page_url', $url, DAY_IN_SECONDS);
    }
    return $url;
}

// program id => program page URL (content from BOS, Buy Now there), for the web app's "Buy" links on locked programs.
function bos_lessons_package_products() {
    $packages = bos_lessons_packages();
    $map      = [];
    foreach (is_wp_error($packages) ? [] : $packages as $package) {
        $map[$package['id']] = bos_lessons_program_url($package['id'], $package['name']);
    }
    return $map;
}
