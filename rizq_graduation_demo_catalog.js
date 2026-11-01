/**
 * كتالوج عرض التخرج المضمّن — يُستخدم عند غياب /api/catalog محلياً.
 * كل منتج يحمل accountId صريحاً. يُحذف مع purge-demo (acc_grad_* / graduationDemo).
 */
(function (global) {
  'use strict';

  function img(seed) {
    return 'https://picsum.photos/seed/' + seed + '/640/480';
  }

  function item(opts) {
    return {
      id: opts.id,
      accountId: opts.accountId,
      storeId: opts.accountId,
      kind: 'product',
      status: 'active',
      name: opts.name,
      nameF: opts.nameF || opts.name,
      price: opts.price,
      cat: opts.cat,
      emoji: opts.emoji || '📦',
      desc: opts.desc || '',
      unit: opts.unit || '',
      images: opts.images || [],
      imgDataArr: opts.images || [],
      is_demo: true,
      isDemo: true,
      graduationDemo: true,
      demoSource: 'graduation'
    };
  }

  var BY_ACCOUNT = {
    acc_grad_store_01: [
      item({ id: 'CAT-GRAD-S01-01', accountId: 'acc_grad_store_01', name: 'هاتف ذكي 128GB', nameF: 'Smartphone 128Go', price: 185000, cat: 'إلكترونيات', emoji: '📱', images: [img('rizq-grad-cat-s01-01')] }),
      item({ id: 'CAT-GRAD-S01-02', accountId: 'acc_grad_store_01', name: 'شاحن سريع Type-C', nameF: 'Chargeur rapide Type-C', price: 3500, cat: 'إلكترونيات', emoji: '🔌', images: [img('rizq-grad-cat-s01-02')] }),
      item({ id: 'CAT-GRAD-S01-03', accountId: 'acc_grad_store_01', name: 'سماعات لاسلكية', nameF: 'Écouteurs sans fil', price: 6500, cat: 'إلكترونيات', emoji: '🎧', images: [img('rizq-grad-cat-s01-03')] }),
      item({ id: 'CAT-GRAD-S01-04', accountId: 'acc_grad_store_01', name: 'غطاء حماية شفاف', nameF: 'Coque transparente', price: 1200, cat: 'إلكترونيات', emoji: '🛡️', images: [img('rizq-grad-cat-s01-04')] }),
      item({ id: 'CAT-GRAD-S01-05', accountId: 'acc_grad_store_01', name: 'باور بانك 20000mAh', nameF: 'Powerbank 20000mAh', price: 9500, cat: 'إلكترونيات', emoji: '🔋', images: [img('rizq-grad-cat-s01-05')] }),
      item({ id: 'CAT-GRAD-S01-06', accountId: 'acc_grad_store_01', name: 'كابل USB-C أصلي', nameF: 'Câble USB-C', price: 1800, cat: 'إلكترونيات', emoji: '📎', images: [img('rizq-grad-cat-s01-06')] })
    ],
    acc_grad_store_02: [
      item({ id: 'CAT-GRAD-S02-01', accountId: 'acc_grad_store_02', name: 'دراعة رجالية قطن', nameF: 'Boubou homme coton', price: 18000, cat: 'أزياء', emoji: '👔', images: [img('rizq-grad-cat-s02-01')] }),
      item({ id: 'CAT-GRAD-S02-02', accountId: 'acc_grad_store_02', name: 'فستان سهرة', nameF: 'Robe de soirée', price: 42000, cat: 'أزياء', emoji: '👗', images: [img('rizq-grad-cat-s02-02')] }),
      item({ id: 'CAT-GRAD-S02-03', accountId: 'acc_grad_store_02', name: 'قميص رجالي', nameF: 'Chemise homme', price: 8500, cat: 'أزياء', emoji: '👕', images: [img('rizq-grad-cat-s02-03')] }),
      item({ id: 'CAT-GRAD-S02-04', accountId: 'acc_grad_store_02', name: 'حقيبة يد نسائية', nameF: 'Sac à main', price: 12000, cat: 'إكسسوارات', emoji: '👜', images: [img('rizq-grad-cat-s02-04')] }),
      item({ id: 'CAT-GRAD-S02-05', accountId: 'acc_grad_store_02', name: 'حذاء نسائي أنيق', nameF: 'Chaussures femme', price: 15000, cat: 'أحذية', emoji: '👠', images: [img('rizq-grad-cat-s02-05')] })
    ],
    acc_grad_store_03: [
      item({ id: 'CAT-GRAD-S03-01', accountId: 'acc_grad_store_03', name: 'خضروات طازجة — سلة يومية', nameF: 'Légumes frais — panier', price: 350, cat: 'أغذية', emoji: '🥬', unit: 'سلة', images: [img('rizq-grad-cat-s03-01')], desc: 'طماطم وبصل وبطاطا موسمية.' }),
      item({ id: 'CAT-GRAD-S03-02', accountId: 'acc_grad_store_03', name: 'أرز بسمتي 25 كغ', nameF: 'Riz basmati 25 kg', price: 3200, cat: 'أغذية', emoji: '🍚', unit: 'كيس', images: [img('rizq-grad-cat-s03-02')] }),
      item({ id: 'CAT-GRAD-S03-03', accountId: 'acc_grad_store_03', name: 'زيت نباتي 5 لتر', nameF: 'Huile végétale 5 L', price: 780, cat: 'أغذية', emoji: '🫒', unit: 'جالون', images: [img('rizq-grad-cat-s03-03')] }),
      item({ id: 'CAT-GRAD-S03-04', accountId: 'acc_grad_store_03', name: 'سكر أبيض 1 كغ', nameF: 'Sucre blanc 1 kg', price: 95, cat: 'أغذية', emoji: '🧂', unit: 'كيس', images: [img('rizq-grad-cat-s03-04')] }),
      item({ id: 'CAT-GRAD-S03-05', accountId: 'acc_grad_store_03', name: 'شاي أخضر فاخر 200غ', nameF: 'Thé vert 200 g', price: 220, cat: 'أغذية', emoji: '🍵', unit: 'علبة', images: [img('rizq-grad-cat-s03-05')] }),
      item({ id: 'CAT-GRAD-S03-06', accountId: 'acc_grad_store_03', name: 'حليب سائل 1 لتر', nameF: 'Lait 1 L', price: 85, cat: 'أغذية', emoji: '🥛', unit: 'علبة', images: [img('rizq-grad-cat-s03-06')] }),
      item({ id: 'CAT-GRAD-S03-07', accountId: 'acc_grad_store_03', name: 'تمر مجدول 1 كغ', nameF: 'Dattes Majdoul 1 kg', price: 450, cat: 'أغذية', emoji: '🌴', unit: 'كيس', images: [img('rizq-grad-cat-s03-07')] }),
      item({ id: 'CAT-GRAD-S03-08', accountId: 'acc_grad_store_03', name: 'دقيق قمح 5 كغ', nameF: 'Farine de blé 5 kg', price: 280, cat: 'أغذية', emoji: '🌾', unit: 'كيس', images: [img('rizq-grad-cat-s03-08')] })
    ],
    acc_grad_store_04: [
      item({ id: 'CAT-GRAD-S04-01', accountId: 'acc_grad_store_04', name: 'خاتم ذهب عيار 21', nameF: 'Bague or 21K', price: 45000, cat: 'ذهب', emoji: '💍', images: [img('rizq-grad-cat-s04-01')] }),
      item({ id: 'CAT-GRAD-S04-02', accountId: 'acc_grad_store_04', name: 'سوار ذهب 10غ', nameF: 'Bracelet or 10g', price: 82000, cat: 'ذهب', emoji: '✨', images: [img('rizq-grad-cat-s04-02')] }),
      item({ id: 'CAT-GRAD-S04-03', accountId: 'acc_grad_store_04', name: 'سلسلة ذهب خفيفة', nameF: 'Chaîne or légère', price: 56000, cat: 'ذهب', emoji: '📿', images: [img('rizq-grad-cat-s04-03')] }),
      item({ id: 'CAT-GRAD-S04-04', accountId: 'acc_grad_store_04', name: 'أقراط ذهب', nameF: 'Boucles d\'oreilles or', price: 28000, cat: 'ذهب', emoji: '💎', images: [img('rizq-grad-cat-s04-04')] })
    ],
    acc_grad_store_05: [
      item({ id: 'CAT-GRAD-S05-01', accountId: 'acc_grad_store_05', name: 'كنبة زاوية عصرية', nameF: 'Canapé d\'angle', price: 195000, cat: 'أثاث', emoji: '🛋️', images: [img('rizq-grad-cat-s05-01')] }),
      item({ id: 'CAT-GRAD-S05-02', accountId: 'acc_grad_store_05', name: 'طاولة طعام 6 أشخاص', nameF: 'Table à manger 6 places', price: 125000, cat: 'أثاث', emoji: '🪵', images: [img('rizq-grad-cat-s05-02')] }),
      item({ id: 'CAT-GRAD-S05-03', accountId: 'acc_grad_store_05', name: 'سرير زوجي خشبي', nameF: 'Lit double bois', price: 98000, cat: 'أثاث', emoji: '🛏️', images: [img('rizq-grad-cat-s05-03')] }),
      item({ id: 'CAT-GRAD-S05-04', accountId: 'acc_grad_store_05', name: 'سجادة صالة 200×300', nameF: 'Tapis salon 200×300', price: 35000, cat: 'أثاث', emoji: '🧶', images: [img('rizq-grad-cat-s05-04')] })
    ],
    acc_grad_store_06: [
      item({ id: 'CAT-GRAD-S06-01', accountId: 'acc_grad_store_06', name: 'فلتر زيت تويوتا', nameF: 'Filtre à huile Toyota', price: 2500, cat: 'سيارات', emoji: '🛢️', images: [img('rizq-grad-cat-s06-01')] }),
      item({ id: 'CAT-GRAD-S06-02', accountId: 'acc_grad_store_06', name: 'بطارية 70 أمبير', nameF: 'Batterie 70A', price: 18500, cat: 'سيارات', emoji: '🔋', images: [img('rizq-grad-cat-s06-02')] }),
      item({ id: 'CAT-GRAD-S06-03', accountId: 'acc_grad_store_06', name: 'مساحات زجاج أمامي', nameF: 'Essuie-glaces', price: 3200, cat: 'سيارات', emoji: '🚙', images: [img('rizq-grad-cat-s06-03')] }),
      item({ id: 'CAT-GRAD-S06-04', accountId: 'acc_grad_store_06', name: 'إطار 265/65 R17', nameF: 'Pneu 265/65 R17', price: 17500, cat: 'سيارات', emoji: '🛞', images: [img('rizq-grad-cat-s06-04')] })
    ]
  };

  function productsFor(accountId) {
    var id = String(accountId || '');
    var list = BY_ACCOUNT[id];
    if (!list) return [];
    return list.map(function (p) {
      return Object.assign({}, p, { accountId: id, storeId: id });
    });
  }

  function allAccountIds() {
    return Object.keys(BY_ACCOUNT);
  }

  function isAlNourDemoId(id) {
    var s = String(id || '');
    return !s || s === 'demo_store' || s === 'acc_promo_store_rizq' || /^acc_promo_store/.test(s);
  }

  /** قائمة منتجات مملوكة للحساب فقط — يرفض خلط حسابات أخرى */
  function ownedOnly(list, accountId) {
    var id = String(accountId || '');
    if (!id) return [];
    return (Array.isArray(list) ? list : []).filter(function (p) {
      if (!p) return false;
      var sid = String(p.accountId || p.storeId || '');
      return !sid || sid === id;
    }).map(function (p) {
      return Object.assign({}, p, { accountId: id, storeId: id });
    });
  }

  global.RizqGraduationCatalog = {
    BY_ACCOUNT: BY_ACCOUNT,
    productsFor: productsFor,
    allAccountIds: allAccountIds,
    isAlNourDemoId: isAlNourDemoId,
    ownedOnly: ownedOnly
  };
})(typeof window !== 'undefined' ? window : global);
