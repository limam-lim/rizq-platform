/**
 * فرض فريدية البريد ورقم الهوية (NNI) على مستوى قاعدة البيانات.
 * كان الفحص في الكود فقط (قراءة → مقارنة → حفظ): تسجيلان متزامنان بنفس البريد
 * ينجحان معاً فيتعطل الدخول لاحقاً (حسابان لبريد واحد).
 *
 * آمن على بيانات قائمة: إن وُجدت تكرارات حالية لا يفشل النشر — يتخطى الفهرس
 * ويطبع تحذيراً واضحاً (تُحل التكرارات يدوياً ثم يُعاد تشغيل هذه الهجرة عبر down/up).
 */
exports.up = (pgm) => {
  pgm.sql(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM accounts WHERE email <> '' GROUP BY lower(email) HAVING COUNT(*) > 1
  ) THEN
    RAISE WARNING 'accounts: duplicate emails exist — unique email index NOT created (resolve duplicates, then rerun)';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_email_lower ON accounts (lower(email)) WHERE email <> '';
  END IF;

  IF EXISTS (
    SELECT 1 FROM accounts WHERE nni <> '' GROUP BY nni HAVING COUNT(*) > 1
  ) THEN
    RAISE WARNING 'accounts: duplicate NNI exist — unique NNI index NOT created (resolve duplicates, then rerun)';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_nni ON accounts (nni) WHERE nni <> '';
  END IF;
END $$;
`);
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS uq_accounts_email_lower; DROP INDEX IF EXISTS uq_accounts_nni;');
};
