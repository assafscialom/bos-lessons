<?php
/**
 * Program page built from the BOS "Page on the website" blocks (web_page), in the account's style:
 * header (label, title, subtitle, intro, price + Buy Now / All programs, note, image) and "What's inside" cards.
 * Price and Buy Now come from the WooCommerce product linked to the program.
 */

if (!defined('ABSPATH')) {
    exit;
}

// The product linked to the program: the current product page if it is the one, else the first product with the meta.
function bos_lessons_product_for_package($package_id) {
    $current = get_the_ID();
    if ($current && get_post_type($current) === 'product' && (string) bos_lessons_product_program_id($current) === (string) $package_id) {
        return wc_get_product($current);
    }
    // All three keys: products linked by the BOS dashboard or an earlier version carry the older ones.
    $ids = get_posts([
        'post_type'   => 'product',
        'post_status' => 'publish',
        'numberposts' => 1,
        'fields'      => 'ids',
        'meta_query'  => [ // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- one product per program, tiny table.
            'relation' => 'OR',
            ['key' => BOS_LESSONS_PROGRAM_META, 'value' => (string) $package_id],
            ['key' => BOS_LESSONS_LEGACY_PROGRAM_META[0], 'value' => (string) $package_id],
            ['key' => BOS_LESSONS_LEGACY_PROGRAM_META[1], 'value' => (string) $package_id],
        ],
    ]);
    return $ids ? wc_get_product($ids[0]) : null;
}

// Program page / program grid styles. Called while a shortcode renders; WordPress prints a late enqueue in the footer.
function bos_lessons_page_styles() {
    wp_enqueue_style('bos-lessons-programs', plugin_dir_url(__DIR__) . 'assets/programs.css', [], BOS_LESSONS_VERSION);
    return '';
}
// In the head when the page content itself holds one of the shortcodes, so the page does not flash unstyled.
add_action('wp_enqueue_scripts', function () {
    $post = is_singular() ? get_post() : null;
    if ($post && (has_shortcode($post->post_content, 'bos_lessons_program') || has_shortcode($post->post_content, 'bos_lessons_programs'))) {
        bos_lessons_page_styles();
    }
});

// Price + Buy Now for programs whose page blocks are not filled yet (description or lesson list only).
function bos_lessons_buy_box(array $package) {
    $product = bos_lessons_product_for_package($package['id']);
    if (!$product) {
        return '';
    }
    $buy = bos_lessons_buy_url($product);
    return bos_lessons_page_styles() . '<div class="bos-pkg"><h1 class="bos-pkg-title">' . esc_html($package['name']) . '</h1>'
        . '<div class="bos-pkg-price">' . wp_kses_post($product->get_price_html()) . '</div>'
        . '<div class="bos-pkg-buttons"><a class="bos-pkg-btn primary" href="' . esc_url($buy) . '">' . esc_html__('Buy Now', 'bos-lessons') . '</a>'
        . '<a class="bos-pkg-btn secondary" href="' . esc_url(bos_lessons_shop_url()) . '">' . esc_html__('All programs', 'bos-lessons') . '</a></div></div>';
}

function bos_lessons_render_package_page(array $package, array $page) {
    $product   = bos_lessons_product_for_package($package['id']);
    $title     = $page['title'] !== '' ? $page['title'] : $package['name'];
    $paragraph = function ($text) {
        return wpautop(esc_html($text));
    };

    $html = bos_lessons_page_styles();

    // alignwide: block themes give it the wide content width (the page is a two-column layout).
    $html .= '<div class="bos-pkg alignwide"><section class="bos-pkg-hero"><div>';
    if ($page['eyebrow'] !== '') {
        $html .= '<p class="bos-pkg-eyebrow">' . esc_html($page['eyebrow']) . '</p>';
    }
    $html .= '<h1 class="bos-pkg-title">' . esc_html($title) . '</h1>';
    if ($page['subtitle'] !== '') {
        $html .= '<p class="bos-pkg-subtitle">' . esc_html($page['subtitle']) . '</p>';
    }
    if ($page['intro'] !== '') {
        $html .= '<div class="bos-pkg-intro">' . $paragraph($page['intro']) . '</div>';
    }
    if ($product) {
        $html .= '<div class="bos-pkg-price">' . wp_kses_post($product->get_price_html()) . '</div>';
        // Buy Now goes straight to checkout with the program in the cart.
        $buy = bos_lessons_buy_url($product);
        $html .= '<div class="bos-pkg-buttons"><a class="bos-pkg-btn primary" href="' . esc_url($buy) . '">' . esc_html__('Buy Now', 'bos-lessons') . '</a>';
    } else {
        $html .= '<div class="bos-pkg-buttons">';
    }
    $html .= '<a class="bos-pkg-btn secondary" href="' . esc_url(bos_lessons_shop_url()) . '">' . esc_html__('All programs', 'bos-lessons') . '</a></div>';
    if ($page['note'] !== '') {
        $html .= '<p class="bos-pkg-note">' . esc_html($page['note']) . '</p>';
    }
    $html .= '</div>';
    if ($page['image'] !== '') {
        $html .= '<div class="bos-pkg-hero-img"><img src="' . esc_url($page['image']) . '" alt="' . esc_attr($title) . '"></div>';
    }
    $html .= '</section>';

    if (!empty($page['items'])) {
        $html .= '<section class="bos-pkg-inside"><h2 class="bos-pkg-inside-title">' . esc_html($page['inside_title'] !== '' ? $page['inside_title'] : __('What’s inside the program', 'bos-lessons')) . '</h2><ul class="bos-pkg-cards">';
        foreach ($page['items'] as $item) {
            $html .= '<li class="bos-pkg-card">';
            if (!empty($item['image'])) {
                $html .= '<img src="' . esc_url($item['image']) . '" alt="" loading="lazy">';
            }
            if (!empty($item['title'])) {
                $html .= '<h3>' . esc_html($item['title']) . '</h3>';
            }
            if (!empty($item['text'])) {
                $html .= '<div class="bos-pkg-card-text">' . $paragraph($item['text']) . '</div>';
            }
            $html .= '</li>';
        }
        $html .= '</ul></section>';
    }
    return $html . '</div>';
}
