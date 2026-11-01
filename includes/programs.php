<?php
/**
 * Content from BOS, purchase through WooCommerce.
 *
 * - One WordPress page with slug "program" containing [bos_program] shows every program:
 *   /program/12-free-your-hip-joints/ (or /program/?bos_program=12).
 * - [bos_programs]: list of all BOS programs (image, name, description, price, View program / Buy Now).
 * - A WooCommerce product linked to a program only holds the price; its page redirects to the program page.
 */

if (!defined('ABSPATH')) {
    exit;
}

const BOS_LESSONS_PROGRAM_PAGE = 'program'; // slug of the page that holds [bos_program]

add_filter('query_vars', function ($vars) {
    $vars[] = 'bos_program';
    return $vars;
});

add_action('init', function () {
    $regex = '^' . BOS_LESSONS_PROGRAM_PAGE . '/([0-9]+)(?:-[^/]*)?/?$';
    add_rewrite_rule($regex, 'index.php?pagename=' . BOS_LESSONS_PROGRAM_PAGE . '&bos_program=$matches[1]', 'top');
    // Self-heal: if the stored rules lack ours (plugin replaced, rules rebuilt elsewhere), rebuild them.
    // At most once an hour, so a plugin that keeps dropping it cannot cause a flush on every request.
    $rules = get_option('rewrite_rules');
    if (is_array($rules) && !isset($rules[$regex]) && !get_transient('bos_lessons_rewrite_flushed')) {
        set_transient('bos_lessons_rewrite_flushed', 1, HOUR_IN_SECONDS);
        flush_rewrite_rules(false);
    }
}, 20); // after other plugins registered their rules, so the rebuild keeps them

function bos_lessons_program_url($package_id, $name = '') {
    $slug = sanitize_title($name);
    return home_url('/' . BOS_LESSONS_PROGRAM_PAGE . '/' . (int) $package_id . ($slug !== '' ? '-' . $slug : '') . '/');
}

// Program shown by [bos_program] without id: /program/12-…/ (query var), else the current product's program.
function bos_lessons_current_program_id() {
    $from_url = get_query_var('bos_program');
    if ($from_url === '' && isset($_GET['bos_program'])) {
        $from_url = sanitize_text_field(wp_unslash($_GET['bos_program']));
    }
    if (ctype_digit((string) $from_url)) {
        return (string) $from_url;
    }
    return (string) bos_lessons_product_program_id(get_the_ID());
}

// The program's name as the page title on /program/12-…/ (WordPress and Yoast SEO titles).
function bos_lessons_program_title() {
    $id = get_query_var('bos_program');
    if (!ctype_digit((string) $id)) {
        return '';
    }
    $package = bos_lessons_package($id);
    return is_array($package) ? $package['name'] : '';
}
add_filter('document_title_parts', function ($parts) {
    $title = bos_lessons_program_title();
    if ($title !== '') {
        $parts['title'] = $title;
    }
    return $parts;
});
add_filter('wpseo_title', function ($title) {
    $name = bos_lessons_program_title();
    return $name !== '' ? $name . ' - ' . get_bloginfo('name') : $title;
});
add_filter('wpseo_opengraph_title', function ($title) {
    $name = bos_lessons_program_title();
    return $name !== '' ? $name : $title;
});

// A product linked to a program has no content of its own: send its page to the program page.
add_action('template_redirect', function () {
    if (!function_exists('is_product') || !is_product()) {
        return;
    }
    $package_id = bos_lessons_product_program_id(get_queried_object_id());
    if (ctype_digit((string) $package_id)) {
        wp_safe_redirect(bos_lessons_program_url($package_id, get_the_title(get_queried_object_id())), 301);
        exit;
    }
});

/**
 * [bos_programs]: every BOS program, with the price and Buy Now of its linked product.
 */
function bos_lessons_programs_shortcode() {
    $packages = bos_lessons_packages();
    if (is_wp_error($packages)) {
        return bos_lessons_editor_notice('Could not load the programs from BOS: ' . esc_html($packages->get_error_message()));
    }
    if (!$packages) {
        return bos_lessons_editor_notice('BOS has no active programs yet.');
    }
    $html = bos_lessons_page_styles() . '<div class="bos-pkg alignwide"><ul class="bos-pkg-cards bos-programs">';
    foreach ($packages as $package) {
        $url     = bos_lessons_program_url($package['id'], $package['name']);
        $product = bos_lessons_product_for_package($package['id']);
        $html   .= '<li class="bos-pkg-card">';
        if (!empty($package['picture'])) {
            $html .= '<a href="' . esc_url($url) . '"><img src="' . esc_url($package['picture']) . '" alt="" loading="lazy"></a>';
        }
        $html .= '<h3><a href="' . esc_url($url) . '" style="color:inherit;text-decoration:none">' . esc_html($package['name']) . '</a></h3>';
        if (!empty($package['description'])) {
            $html .= '<div class="bos-pkg-card-text">' . wpautop(esc_html($package['description'])) . '</div>';
        }
        if ($product) {
            $html .= '<div class="bos-pkg-price" style="font-size:1.5rem;margin:12px 0">' . wp_kses_post($product->get_price_html()) . '</div>';
        }
        $html .= '<div class="bos-pkg-buttons" style="margin:0">';
        $html .= '<a class="bos-pkg-btn secondary" href="' . esc_url($url) . '">' . esc_html__('View program', 'bos-lessons') . '</a>';
        if ($product) {
            $html .= '<a class="bos-pkg-btn primary" href="' . esc_url(add_query_arg('add-to-cart', $product->get_id(), wc_get_checkout_url())) . '">' . esc_html__('Buy Now', 'bos-lessons') . '</a>';
        }
        $html .= '</div></li>';
    }
    return $html . '</ul></div>';
}
add_shortcode('bos_programs', 'bos_lessons_programs_shortcode');
add_shortcode('sim_programs', 'bos_lessons_programs_shortcode'); // legacy name
