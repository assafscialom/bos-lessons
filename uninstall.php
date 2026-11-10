<?php
/**
 * Removes the plugin's own data when it is deleted from WordPress.
 * Product links (_bos_lessons_program_id) and order notes are left in place: they are the site's records.
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

delete_option('bos_lessons');
delete_transient('bos_lessons_packages');
delete_transient('bos_lessons_page_url');
delete_transient('bos_lessons_rewrite_flushed');

global $wpdb;
// Per-program caches: bos_lessons_package_<id>.
// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- one-off cleanup on uninstall.
$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '\_transient\_bos\_lessons\_package\_%' OR option_name LIKE '\_transient\_timeout\_bos\_lessons\_package\_%'");
