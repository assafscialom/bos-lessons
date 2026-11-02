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
    $ids = get_posts([
        'post_type'   => 'product',
        'post_status' => 'publish',
        'numberposts' => 1,
        'fields'      => 'ids',
        'meta_key'    => BOS_LESSONS_PROGRAM_META, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key -- one product per program, tiny table.
        'meta_value'  => (string) $package_id, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
    ]);
    return $ids ? wc_get_product($ids[0]) : null;
}

// Program page / program list styles, printed once per request.
function bos_lessons_page_styles() {
    static $printed = false;
    if ($printed) {
        return '';
    }
    $printed = true;
    return '<style>
.bos-pkg{--g:#688f31;--lime:oklch(0.902 0.163 128);--ink:oklch(0.22 0.03 265);--muted:#606060;--line:#d9d9d9;color:#181818}
.bos-pkg *{box-sizing:border-box}
.bos-pkg-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;align-items:center;margin:0 0 64px}
.bos-pkg-eyebrow{color:var(--muted);font-size:1rem;font-weight:600;letter-spacing:.28em;text-transform:uppercase;margin:0 0 16px}
.bos-pkg h1.bos-pkg-title{color:var(--g);font-size:clamp(2.4rem,5vw,3.9rem);font-weight:700;letter-spacing:-.025em;line-height:1.05;margin:0 0 20px}
.bos-pkg-subtitle{font-size:1.6rem;font-weight:700;margin:0 0 16px;line-height:1.25}
.bos-pkg-intro{color:#4a4a4a;font-size:1.2rem;line-height:1.7}
.bos-pkg-intro p{margin:0 0 1em}
.bos-pkg-price{color:var(--g);font-size:2.2rem;font-weight:700;margin:8px 0 20px}
.bos-pkg-price del{color:var(--muted);font-size:.6em;font-weight:400}
.bos-pkg-buttons{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 20px}
.bos-pkg-btn{display:inline-block;padding:14px 28px;border-radius:6px;font-weight:600;text-decoration:none!important;line-height:1.2}
.bos-pkg-btn.primary{background:var(--lime);color:var(--ink)!important;box-shadow:0 6px 18px -10px rgba(0,0,0,.6)}
.bos-pkg-btn.secondary{background:#f7f7f7;border:1px solid var(--line);color:#181818!important}
.bos-pkg-note{color:#4a4a4a;font-size:1.1rem;margin:0}
.bos-pkg-hero-img img{width:100%;height:auto;display:block;border:2px solid var(--g);border-radius:16px}
.bos-pkg h2.bos-pkg-inside-title{font-size:clamp(2rem,4vw,3rem);font-weight:700;letter-spacing:-.025em;margin:0 0 28px}
.bos-pkg-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;list-style:none;margin:0 0 48px;padding:0}
.bos-pkg-card{border:2px solid var(--g);border-radius:16px;padding:24px;background:#fff}
.bos-pkg-card img{width:100%;height:auto;max-height:520px;object-fit:contain;background:#f4f2ed;border-radius:8px;display:block;margin:0 0 18px} /* whole image, never cropped */
.bos-pkg-card h3{font-size:1.2rem;font-weight:700;margin:0 0 10px;line-height:1.3}
.bos-pkg-card-text,.bos-pkg-card-text p{color:#4a4a4a;line-height:1.6;font-size:1rem}
.bos-programs .bos-pkg-card{display:flex;flex-direction:column}
.bos-programs .bos-pkg-buttons{margin-top:auto!important;padding-top:8px}
.bos-programs .bos-pkg-btn{padding:10px 18px;font-size:.95rem}
.bos-pkg-card-text p{margin:0 0 .8em}
@media (max-width:900px){.bos-pkg-hero{grid-template-columns:1fr;gap:28px}.bos-pkg-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:600px){.bos-pkg-cards{grid-template-columns:1fr}}
</style>';
}

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
