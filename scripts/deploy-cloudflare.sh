#!/usr/bin/env bash
# ============================================================================
# FIA Academy — Cloudflare Workers Deploy Script (v10.22)
# ============================================================================
# الاستخدام:
#   CF_API_TOKEN=xxx CF_ACCOUNT_ID=yyy bash scripts/deploy-cloudflare.sh
#
# المتطلبات:
#   1) CF_API_TOKEN — توكن من dashboard.cloudflare.com → My Profile → API Tokens
#      بالصلاحيات: Workers Scripts:Edit + Account Settings:Read
#   2) CF_ACCOUNT_ID — من الصفحة الرئيسية في لوحة Cloudflare (يمين)
#
# ما يفعله السكربت:
#   1) بناء OpenNext
#   2) ضبط الأسرار (DATABASE_URL, SUPABASE_*) — تُقرأ من .dev.vars المحلي
#   3) النشر إلى Cloudflare Workers + طباعة الرابط الحي
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${CF_API_TOKEN:-}" ] || [ -z "${CF_ACCOUNT_ID:-}" ]; then
  echo "❌ يلزم CF_API_TOKEN و CF_ACCOUNT_ID"
  exit 1
fi
export CLOUDFLARE_API_TOKEN="$CF_API_TOKEN"
export CLOUDFLARE_ACCOUNT_ID="$CF_ACCOUNT_ID"

echo "🔍 [1/4] التحقق من الحساب..."
curl -s -H "Authorization: Bearer $CF_API_TOKEN" https://api.cloudflare.com/client/v4/user/tokens/verify | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅ التوكن سليم' if d.get('success') else '❌ توكن غير صالح: '+json.dumps(d.get('errors',[])))"

echo "🏗️ [2/4] البناء..."
npx opennextjs-cloudflare build

echo "🔐 [3/4] ضبط الأسرار..."
# قراءة الأسرار من .dev.vars (لا يُرفع إلى git أبداً)
set -a; source .dev.vars 2>/dev/null || true; set +a
for secret_name in DATABASE_URL SUPABASE_URL SUPABASE_SERVICE_KEY NEXT_PUBLIC_SUPABASE_ANON_KEY TELEGRAM_BOT_TOKEN FIREBASE_PROJECT_ID FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY; do
  val="${!secret_name:-}"
  if [ -n "$val" ]; then
    printf '%s' "$val" | npx wrangler secret put "$secret_name" >/dev/null 2>&1 && echo "  ✅ $secret_name" || echo "  ⚠️ فشل $secret_name (سيُطلب لاحقاً)"
  else
    echo "  ⏭️ $secret_name غير متوفر محلياً — يُضاف لاحقاً"
  fi
done

echo "🚀 [4/4] النشر..."
npx wrangler deploy
echo ""
echo "👑 تم! الموقع الحي: https://fia-academy.<حسابك>.workers.dev"
