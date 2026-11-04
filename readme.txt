=== BOS Lessons ===
Contributors: iqdesk
Tags: video lessons, audio lessons, woocommerce, yoga, online classes
Requires at least: 5.8
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Sell video and audio lessons from your own WordPress site. Students buy through WooCommerce and watch on your site or in your branded app.

== Description ==

BOS Lessons connects your WordPress site to your BOS account, a hosted service for teachers who sell video and audio lessons: yoga, Pilates, fitness, meditation, dance, music.

You upload lessons and group them into programs in the BOS dashboard. The plugin shows them on your site:

* `[bos_app]` – the lesson library and player: sign-in, search, favourites, progress, audio and video playback. One page.
* `[bos_programs]` – a grid of all your programs with price and a Buy Now button.
* `[bos_program id="12"]` – one program page, built from the content you wrote in BOS. On a WooCommerce product linked to a program the id is not needed.

With WooCommerce installed:

* Link a WooCommerce product to a program (product edit screen, "Program in the app").
* A paid order opens the program for the buyer's email. BOS creates the student account if needed and emails a "set your password" link.
* A refunded or cancelled order closes it again.
* After checkout the buyer lands inside the player, signed in, with the program open.

The same student account works in the branded iOS and Android app BOS publishes for you (App plan).

= Requirements =

* A BOS account and API key. Accounts are approved by hand: apply at [bos.work/apply](https://bos.work/apply).
* WooCommerce, for program pages and selling. The lesson library (`[bos_app]`) works without it.

= External services =

This plugin connects to the BOS service operated by IQDesk. Without it the plugin shows nothing.

What is sent, and when:

* **Lesson and program data** – when a visitor opens a page with `[bos_app]`, `[bos_programs]` or `[bos_program]`, your site calls the BOS API (`api.bos.work`, or the API URL set in Settings) to fetch programs, lessons and media URLs. Your API key and your site address are sent with each call.
* **Student actions** – sign-in, sign-up, password reset, favourites and progress made in the player are relayed from the visitor's browser through your site (`/wp-json/bos/v1/proxy/…`) to the BOS API. The student's email, password and a session token pass through your server; they are not stored in WordPress.
* **Orders** – when a WooCommerce order is paid, refunded or cancelled, your site sends the buyer's email, name, the order number and the program ids to BOS so the purchase can be opened or closed. Calls are signed with your API key.

Terms of service: https://bos.work/terms
Privacy policy: https://bos.work/privacy

The player bundled in `app/bos-lessons.js` is built from the source in `app-src/` (React + Vite). Source and build instructions: https://github.com/assafscialom/bos-lessons

== Installation ==

1. Install and activate the plugin.
2. Go to Settings → BOS Lessons and paste your API key from the BOS dashboard.
3. Create a page and add `[bos_app]`. This is your lesson library.
4. Create a page with the slug `program` and add `[bos_program]`. Program pages are served at `/program/12-program-name/`.
5. Optional, to sell: install WooCommerce, create a product per program and pick the program in "Program in the app" on the product.

== Frequently Asked Questions ==

= Do I need WooCommerce? =

For program pages and selling, yes. The lesson library (`[bos_app]`) works without it for students who already have access.

= Where are the videos hosted? =

On BOS. Nothing is uploaded to your WordPress media library, so your hosting plan is not affected by video storage or bandwidth.

= Can I use my own design? =

The player is scoped under `#bos-app` and the program pages use `.bos-pkg` classes, so your theme styles stay untouched and you can override ours in your theme's CSS.

= What happens if I deactivate the plugin? =

The shortcodes stop rendering. Product links and orders stay as they are. Deleting the plugin removes its settings and caches.

= Does it work with page builders and block themes? =

Yes. The shortcodes work anywhere shortcodes do, and the thank-you box supports both the classic and the block checkout.

== Screenshots ==

1. The lesson library ([bos_app]) on a WordPress page.
2. Program grid ([bos_programs]) with price and Buy Now.
3. A program page built from the content written in BOS.
4. Linking a WooCommerce product to a program.
5. Settings → BOS Lessons.

== Changelog ==

= 1.0.1 =
* Price and Buy Now now appear for products linked with the older _sim_package_id key (migrated shops).

= 1.0.0 =
* First public release.

== Upgrade Notice ==

= 1.0.0 =
First public release.
