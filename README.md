# 🎓 أكاديمية المستقبل الدولية (FIA)

منصة تعليم طبي معتمدة — بُنيت بـ Next.js 16 + TypeScript + Supabase + Tailwind CSS 4.

## ✨ المميزات

### للجميع (الصفحة العامة)
- 🏠 صفحة رئيسية بهيرو متحرك وأقسام متعددة
- 📚 عرض الدورات الطبية المعتمدة
- 👨‍⚕️ تعريف بالمدربين الخبراء
- 🤝 الشركاء والاعتمادات الدولية
- 🔐 التحقق من الشهادات برقم الشهادة + معاينة الشهادة الاحترافية
- 📞 معلومات التواصل (هاتف / بريد / عنوان)

### للمتدرب (9 أقسام)
- 📊 نظرة عامة على النشاط
- 📖 دوراتي المسجّلة مع شريط التقدّم
- 🧭 استكشاف الدورات المتاحة
  - تسجيل مباشر في الدورات المجانية
  - نافذة دفع للاشتراك في الدورات المدفوعة (جيب / جوالي / الكريمي)
- 📝 اختباراتي
- 📈 نتائجي
- 🏆 شهاداتي (تحميل PDF + PNG معاينة)
- 💳 مدفوعاتي
- 👤 ملف شخصي مع رفع صورة شخصية (ضغط تلقائي)
- 🔔 الإشعارات والإعدادات

### للمدرب (7 أقسام)
- 📊 نظرة عامة
- 📚 دوراتي التدريبية (CRUD كامل)
- 🎯 إدارة محتوى الدورة (Modules + Lessons):
  - إضافة وحدات لكل دورة
  - إضافة دروس بـ4 أنواع:
    - **فيديو** (رفع مباشر إلى تيليجرام بوت)
    - **نص** (محرر نصي)
    - **اختبار** (JSON أسئلة وإجابات)
    - **PDF** (رفع إلى Supabase Storage)
  - شارة "معاينة مجانية" للدروس المتاحة للزوار
- 👥 متدربوّ (قائمة بالمسجّلين)
- 📝 الاختبارات
- 👤 ملف شخصي مع رفع صورة شخصية
- 🔔 الإشعارات والإعدادات

### للمدير (14 قسم)
- 📊 الإحصائيات العامة (دورات / مدربون / متدربون / معاملات)
- 📚 إدارة الدورات (CRUD)
- 📝 إدارة الاختبارات
- 👥 إدارة المتدربين
- 💳 إدارة المدفوعات (تحديث الحالة)
- 💰 طرق الدفع (تفعيل / تعطيل)
- 🏆 إدارة الشهادات
- 👨‍⚕️ إدارة المدربين (إضافة ببريد وكلمة مرور)
- 🤝 إدارة الشركاء
- 🛡️ إدارة التراخيص
- 👤 المؤسس والفريق
- ⚙️ إعدادات الموقع (الاسم / الهاتف / البريد / تكامل تيليجرام)
- 📈 التقارير
- 📜 سجل العمليات

## 🏆 الشهادة الاحترافية

مولّد شهادات احترافية بـ:
- شعار FIA + اسم الأكاديمية (عربي + إنجليزي)
- اسم المتدرب بحجم كبير وذهبي
- عنوان الدورة
- **باركود Code-128** برقم الشهادة
- **رمز QR** يربط بصفحة التحقق
- **ختم ذهبي** مع 8 نجوم حوله
- خط توقيع + اسم المدير التنفيذي
- حدود كحلي سميكة + حدود ذهبية داخلية
- علامة مائية قطرية "FIA" خفيفة

## 🛠️ التقنيات المستخدمة

| الفئة | التقنية |
|------|---------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI | shadcn/ui (New York style) + Lucide icons |
| Database | Supabase (PostgreSQL + REST API + Storage) |
| Auth | مخصص (users + trainers tables) |
| Certificate | ReportLab + qrcode + arabic_reshaper + python-bidi |
| State | Zustand |
| Toasts | Sonner |
| Video Upload | Telegram Bot API |

## 🎨 الهوية البصرية

- **الألوان**: كحلي `#0B1635` + ذهبي `#D4AF37`
- **الخط**: Cairo (عربي + لاتيني)
- **الاتجاه**: RTL (من اليمين لليسار)
- **الشعار**: FIA (gold "F" on navy circle)

## 🚀 التشغيل المحلي

```bash
# 1. تثبيت الاعتماديات
bun install   # أو npm install / pnpm install

# 2. إعداد متغيرات البيئة
cp .env.example .env
# ثم عدّل ملف .env بإدخال قيم Supabase الحقيقية

# 3. إنشاء الجداول في Supabase
# اذهب إلى Supabase Dashboard → SQL Editor ونفّذ:
# - supabase/migrations/001_create_tables.sql
# - supabase/migrations/002_modules_lessons_enrollments.sql

# 4. تشغيل خادم التطوير
bun run dev
# افتح http://localhost:3000

# 5. (اختياري) توليد شهادة للاختبار
python3 scripts/generate_certificate.py "اسم المتدرب" "عنوان الدورة" "FIA-2025-00001" "2025/01/01" output.pdf "https://verify-url"

# 6. lint
bun run lint
```

## 🔑 الحسابات التجريبية

| الدور | البريد | كلمة المرور |
|------|--------|-------------|
| المدير | admin@fia.edu | admin123 |
| المدرب | trainer@fia.edu | trainer123 |
| متدرب | (أنشئ حساباً جديداً من زر "تسجيل") |  |

## 📁 بنية المشروع

```
FIA_academy/
├── src/
│   ├── app/
│   │   ├── page.tsx                      # الصفحة الرئيسية + توجيه حسب الدور
│   │   ├── layout.tsx                    # تخطيط RTL + خط Cairo
│   │   ├── globals.css                   # نظام تصميم FIA (كحلي+ذهبي)
│   │   └── api/
│   │       ├── auth/{login,register}/   # مصادقة
│   │       ├── courses/                  # CRUD دورات
│   │       ├── trainers/                # CRUD مدربين
│   │       ├── students/                # CRUD متدربين
│   │       ├── modules/                 # CRUD وحدات
│   │       ├── lessons/                 # CRUD دروس
│   │       ├── enrollments/             # CRUD تسجيلات
│   │       ├── certificates/            # CRUD شهادات + تحقق
│   │       ├── partners/                # CRUD شركاء
│   │       ├── licenses/                # CRUD تراخيص
│   │       ├── payment-methods/         # CRUD طرق دفع
│   │       ├── payments/                # CRUD مدفوعات
│   │       ├── site-settings/           # إعدادات الموقع
│   │       ├── upload/{image,avatar,telegram}/  # رفع ملفات
│   │       └── certificate-pdf/         # مولّد PDF/PNG للشهادات
│   ├── components/
│   │   ├── ui/                          # shadcn/ui
│   │   └── fia/
│   │       ├── header.tsx
│   │       ├── footer.tsx
│   │       ├── public-site.tsx
│   │       ├── login-modal.tsx
│   │       ├── avatar-uploader.tsx
│   │       ├── course-content-manager.tsx
│   │       └── dashboards/
│   │           ├── shell.tsx           # قالب لوحة التحكم المشترك
│   │           ├── student.tsx         # لوحة المتدرب
│   │           ├── trainer.tsx         # لوحة المدرب
│   │           └── admin.tsx           # لوحة المدير
│   └── lib/
│       ├── supabase.ts                  # عميل Supabase
│       ├── auth-store.ts                # Zustand auth state
│       ├── types.ts
│       └── utils.ts
├── scripts/
│   ├── generate_certificate.py          # مولّد PDF للشهادة
│   └── generate_certificate_png.py      # مولّد PNG للشهادة
├── supabase/migrations/
│   ├── 001_create_tables.sql           # الجداول الأساسية
│   └── 002_modules_lessons_enrollments.sql  # الوحدات/الدروس/التسجيلات
├── public/fia/                          # الشعار والأيقونات
├── prisma/schema.prisma                 # (إذا كنت تستخدم Prisma)
├── .env.example                         # قالب متغيرات البيئة
└── package.json
```

## 📜 التراخيص

الشهادات معتمدة من:
- وزارة الصحة العامة والسكان (رقم: FIA-MED-2024-0142)
- American Heart Association (AHA-TC-4891) — لدورات BLS/ACLS

## 📞 التواصل

- 📞 +967 700 000 000
- ✉️ info@fia.edu
- 📍 صنعاء، الجمهورية اليمنية

## 📄 الترخيص

© أكاديمية المستقبل الدولية (FIA). جميع الحقوق محفوظة.
