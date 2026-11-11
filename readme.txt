=== BOS Lessons ===
Contributors: ascialom74
Tags: video lessons, audio lessons, woocommerce, yoga, online classes
Requires at least: 5.8
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.0.6
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Sell video and audio lessons from your own WordPress site. Students buy through WooCommerce and watch on your site or in your branded app.

== Description ==

BOS Lessons connects your WordPress site to your BOS account, a hosted service for teachers who sell video and audio lessons: yoga, Pilates, fitness, meditation, dance, music.

You upload lessons and group them into programs in the BOS dashboard. The plugin shows them on your site:

* `[bos_lessons_app]` – the lesson library and player: sign-in, search, favourites, progress, audio and video playback. One page.
* `[bos_lessons_programs]` – a grid of all your programs with price and a Buy Now button.
* `[bos_lessons_program id="12"]` – one program page, built from the content you wrote in BOS. On a WooCommerce product linked to a program the id is not needed.

With WooCommerce installed:

* Link a WooCommerce product to a program (product edit screen, "Program in the app").
* A paid order opens the program for the buyer's email. BOS creates the student account if needed and emails a "set your password" link.
* A refunded or cancelled order closes it again.
* After checkout the buyer lands inside the player, signed in, with the program open.

The same student account works in the branded iOS and Android app BOS publishes for you (App plan).

= Requirements =

* A BOS account and API key. Accounts are free and open as soon as you confirm your email: [bos.work/apply](https://bos.work/apply).
* WooCommerce, for program pages and selling. The lesson library (`[bos_lessons_app]`) works without it.

= External services =

This plugin connects to the BOS service operated by IQDesk. Without it the plugin shows nothing.

What is sent, and when:

* **Lesson and program data** – when a visitor opens a page with `[bos_lessons_app]`, `[bos_lessons_programs]` or `[bos_lessons_program]`, your site calls the BOS API (`api.bos.work`, or the API URL set in Settings) to fetch programs, lessons and media URLs. Your API key and your site address are sent with each call.
* **Student actions** – sign-in, sign-up, password reset, favourites and progress made in the player are relayed from the visitor's browser through your site (`/wp-json/bos-lessons/v1/proxy/…`) to the BOS API. The student's email, password and a session token pass through your server; they are not stored in WordPress.
* **Orders** – when a WooCommerce order is paid, refunded or cancelled, your site sends the buyer's email, name, the order number and the program ids to BOS so the purchase can be opened or closed. Calls are signed with your API key.

Terms of service: https://bos.work/terms
Privacy policy: https://bos.work/privacy

Video lessons are played in an embedded YouTube or Vimeo player, depending on where the teacher hosted the video. When a student opens a video lesson, their browser loads the player from `youtube-nocookie.com` or `player.vimeo.com`; that service receives the video id and the student's IP address and browser details. Audio lessons do not use these services.

* YouTube: [terms](https://www.youtube.com/t/terms), [privacy policy](https://policies.google.com/privacy)
* Vimeo: [terms](https://vimeo.com/terms), [privacy policy](https://vimeo.com/privacy)

The player bundled in `app/bos-lessons.js` is built from the source in `app-src/` (React + Vite). Source and build instructions: https://github.com/assafscialom/bos-lessons

== Installation ==

1. Install and activate the plugin.
2. Go to Settings → BOS Lessons and paste your API key from the BOS dashboard.
3. Create a page and add `[bos_lessons_app]`. This is your lesson library.
4. Create a page with the slug `program` and add `[bos_lessons_program]`. Program pages are served at `/program/12-program-name/`.
5. Optional, to sell: install WooCommerce, create a product per program and pick the program in "Program in the app" on the product.

== Frequently Asked Questions ==

= Do I need WooCommerce? =

For program pages and selling, yes. The lesson library (`[bos_lessons_app]`) works without it for students who already have access.

= Where are the videos hosted? =

Audio and images are hosted on BOS. Videos stay on your own YouTube or Vimeo account (unlisted works) and you paste the link into the lesson. Nothing is uploaded to your WordPress media library, so your hosting plan is not affected by storage or bandwidth.

= Can I use my own design? =

The player is scoped under `#bos-app` and the program pages use `.bos-pkg` classes, so your theme styles stay untouched and you can override ours in your theme's CSS.

= What happens if I deactivate the plugin? =

The shortcodes stop rendering. Product links and orders stay as they are. Deleting the plugin removes its settings and caches.

= Does it work with page builders and block themes? =

Yes. The shortcodes work anywhere shortcodes do, and the thank-you box supports both the classic and the block checkout.

== Screenshots ==

1. Program grid ([bos_lessons_programs]) with the WooCommerce price and Buy Now. Shown with an example teacher.
2. A program page ([bos_lessons_program]) built from the content written in BOS.
3. Student sign-in for the lesson library ([bos_lessons_app]), with the teacher's own logo.

== Changelog ==

= 1.0.6 =
* Fix: in 1.0.5 the lesson app ([bos_lessons_app]) did not load (a script error left the page empty). Update if you run 1.0.5.

= 1.0.5 =
* New setting "Sections in the app" (Settings → BOS Lessons): choose which tabs [bos_lessons_app] shows besides Programs: Lessons, Favourites, History. Defaults keep the earlier behaviour (Favourites and History on, Lessons off).
* Lessons section: every lesson, with search and a find-by-position page. Lessons outside the student's programs are shown locked and open their program page, where the program can be bought.
* A section that is switched off has no tab and its links open Programs.

= 1.0.4 =
* Fix: after upgrading from 1.0.2, program pages (/program/12-…/) showed the program list because WordPress kept the old rewrite rule. The plugin now rebuilds a stale rule by itself.

= 1.0.3 =
* Shortcodes are now `[bos_lessons_app]`, `[bos_lessons_programs]` and `[bos_lessons_program]`. The earlier short names are no longer registered: update the pages that use them.
* The link between a product and a program is stored as `_bos_lessons_program_id`. Links saved by earlier versions keep working.
* The program page styles load as a stylesheet.

= 1.0.2 =
* The sign-in screens show your own logo: the new Logo URL setting, else your site logo, else your site icon. The plugin no longer ships a logo of its own.

= 1.0.1 =
* Price and Buy Now now appear for products linked with the older _sim_package_id key (migrated shops).

= 1.0.0 =
* First public release.

== Upgrade Notice ==

= 1.0.6 =
Fixes the lesson app not loading in 1.0.5. Includes the 1.0.5 setting for the app's sections.

= 1.0.5 =
Adds a setting to show a Lessons tab, and to hide Favourites or History. Nothing changes until you change the setting.

= 1.0.4 =
Fixes program pages that showed the program list after upgrading from 1.0.2.

= 1.0.3 =
The shortcodes were renamed to [bos_lessons_app], [bos_lessons_programs] and [bos_lessons_program]. Update your pages after upgrading.

= 1.0.0 =
First public release.
