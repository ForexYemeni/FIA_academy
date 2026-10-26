import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * FIA Academy — OpenNext Cloudflare configuration (v10.22)
 *
 * تهيئة أساسية بسيطة: بلا كاش R2 إضافي (الخطة المجانية) —
 * الصفحات الثابتة تُخدم من أصول Cloudflare المجانية، والديناميكية
 * تُحسب عند الطلب في Worker واحد.
 */
export default defineCloudflareConfig({});
