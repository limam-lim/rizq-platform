/**
 * rizq_mr_geo.js — التقسيم الإداري لموريتانيا للبحث العقاري
 * الولاية → المدينة (مقاطعة) → الحي/المنطقة (بلدية + أحياء معروفة)
 * المصدر: openadmindata.org (15 ولاية / 63 مقاطعة / 238 بلدية) + تسميات عربية
 * وأحياء المدن الرئيسية من مصادر محلية / خرائط (مثل ازويرات وأطار).
 */
(function (global) {
  'use strict';
  var GEO = {
  "country": {
    "ar": "موريتانيا",
    "fr": "Mauritanie",
    "code": "MR"
  },
  "source": "openadmindata.org/api/v1/countries/mr.json + official Arabic labels",
  "levels": [
    {
      "key": "wilaya",
      "ar": "الولاية",
      "fr": "Wilaya"
    },
    {
      "key": "city",
      "ar": "المدينة",
      "fr": "Ville / Moughataa"
    },
    {
      "key": "neighborhood",
      "ar": "الحي أو المنطقة",
      "fr": "Quartier / Commune"
    }
  ],
  "wilayas": [
    {
      "id": "MR13",
      "ar": "نواكشوط الغربية",
      "fr": "Nouakchott Ouest",
      "cities": [
        {
          "id": "MR133",
          "ar": "السبخة",
          "fr": "Sebkha",
          "neighborhoods": [
            {
              "ar": "السبخة",
              "fr": "السبخة"
            },
            {
              "ar": "حي السبخة",
              "fr": "حي السبخة"
            },
            {
              "ar": "حي الميناء الغربي",
              "fr": "Port ouest"
            },
            {
              "ar": "حي لبتار",
              "fr": "Lebtar"
            }
          ]
        },
        {
          "id": "MR131",
          "ar": "لكصر",
          "fr": "Ksar",
          "neighborhoods": [
            {
              "ar": "لكصر",
              "fr": "لكصر"
            },
            {
              "ar": "لكصر المركزي",
              "fr": "لكصر المركزي"
            },
            {
              "ar": "حي العائلات",
              "fr": "حي العائلات"
            },
            {
              "ar": "حي لكصر القديم",
              "fr": "حي لكصر القديم"
            },
            {
              "ar": "سوق لكصر",
              "fr": "سوق لكصر"
            }
          ]
        },
        {
          "id": "MR132",
          "ar": "تفرغ زينة",
          "fr": "Tevragh Zeina",
          "neighborhoods": [
            {
              "ar": "تفرغ زينة",
              "fr": "Tevragh Zeina"
            },
            {
              "ar": "حي الدبلوماسيين",
              "fr": "Quartier des Diplomates"
            },
            {
              "ar": "حي المرابطين",
              "fr": "Al Mourabitine"
            },
            {
              "ar": "حي السعادة",
              "fr": "Assaada"
            },
            {
              "ar": "قرب دوار تفرغ زينة",
              "fr": "Près du rond-point Tevragh Zeina"
            },
            {
              "ar": "حي راقٍ — تفرغ زينة",
              "fr": "Quartier résidentiel Tevragh Zeina"
            },
            {
              "ar": "القطب",
              "fr": "El Koutb"
            }
          ]
        }
      ]
    },
    {
      "id": "MR14",
      "ar": "نواكشوط الشمالية",
      "fr": "Nouakchott Nord",
      "cities": [
        {
          "id": "MR141",
          "ar": "توجنين",
          "fr": "Toujounine",
          "neighborhoods": [
            {
              "ar": "تيارت",
              "fr": "Teyaret"
            },
            {
              "ar": "توجنين",
              "fr": "توجنين"
            },
            {
              "ar": "حي توجنين",
              "fr": "حي توجنين"
            }
          ]
        },
        {
          "id": "MR142",
          "ar": "دار النعيم",
          "fr": "Dar Naïm",
          "neighborhoods": [
            {
              "ar": "دار النعيم",
              "fr": "Dar Naim"
            },
            {
              "ar": "دار النعيم",
              "fr": "دار النعيم"
            },
            {
              "ar": "حي دار النعيم",
              "fr": "حي دار النعيم"
            }
          ]
        },
        {
          "id": "MR143",
          "ar": "تيارت",
          "fr": "Teyarett",
          "neighborhoods": [
            {
              "ar": "توجنين",
              "fr": "توجنين"
            },
            {
              "ar": "تيارت",
              "fr": "تيارت"
            },
            {
              "ar": "حي تيارت",
              "fr": "حي تيارت"
            }
          ]
        }
      ]
    },
    {
      "id": "MR15",
      "ar": "نواكشوط الجنوبية",
      "fr": "Nouakchott Sud",
      "cities": [
        {
          "id": "MR152",
          "ar": "عرفات",
          "fr": "Arafat",
          "neighborhoods": [
            {
              "ar": "عرفات",
              "fr": "عرفات"
            },
            {
              "ar": "حي عرفات",
              "fr": "حي عرفات"
            },
            {
              "ar": "حي الصداقة",
              "fr": "Hay Sadaqa"
            },
            {
              "ar": "حي الكويت",
              "fr": "Hay Kuwait"
            }
          ]
        },
        {
          "id": "MR151",
          "ar": "الميناء",
          "fr": "El Mina",
          "neighborhoods": [
            {
              "ar": "الميناء",
              "fr": "الميناء"
            },
            {
              "ar": "سوق العاصمة",
              "fr": "سوق العاصمة"
            },
            {
              "ar": "حي الصيادين",
              "fr": "Quartier des pêcheurs"
            }
          ]
        },
        {
          "id": "MR153",
          "ar": "الرياض",
          "fr": "Riad",
          "neighborhoods": [
            {
              "ar": "الرياض",
              "fr": "الرياض"
            }
          ]
        }
      ]
    },
    {
      "id": "MR08",
      "ar": "داخلت نواذيبو",
      "fr": "Dakhlet Nouadhibou",
      "cities": [
        {
          "id": "MR081",
          "ar": "نواذيبو",
          "fr": "Nouadhibou",
          "neighborhoods": [
            {
              "ar": "نواذيبو",
              "fr": "نواذيبو"
            },
            {
              "ar": "بولنوار",
              "fr": "Boulenouar"
            },
            {
              "ar": "إينال",
              "fr": "Inal"
            }
          ]
        },
        {
          "id": "MR082",
          "ar": "الشامي",
          "fr": "Chami",
          "neighborhoods": [
            {
              "ar": "الشامي",
              "fr": "الشامي"
            },
            {
              "ar": "تميميشات",
              "fr": "Tmeimichat"
            },
            {
              "ar": "انوامغار",
              "fr": "Nouamghar"
            }
          ]
        }
      ]
    },
    {
      "id": "MR06",
      "ar": "الترارزة",
      "fr": "Trarza",
      "cities": [
        {
          "id": "MR067",
          "ar": "تكانه",
          "fr": "Tekane",
          "neighborhoods": [
            {
              "ar": "تكانه",
              "fr": "Tekane"
            },
            {
              "ar": "تيكان",
              "fr": "Teikane"
            },
            {
              "ar": "شمام",
              "fr": "Chemame"
            },
            {
              "ar": "تيشتيات",
              "fr": "Teichteyat"
            },
            {
              "ar": "لكصبة 2",
              "fr": "Lexelbe 2"
            }
          ]
        },
        {
          "id": "MR061",
          "ar": "بوتلميت",
          "fr": "Boutilimit",
          "neighborhoods": [
            {
              "ar": "بوتلميت",
              "fr": "بوتلميت"
            },
            {
              "ar": "الب ادريس",
              "fr": "Elb Adress"
            },
            {
              "ar": "اجوير",
              "fr": "Ajoueir"
            },
            {
              "ar": "انتيشيت",
              "fr": "N'Teichet"
            },
            {
              "ar": "النباغية",
              "fr": "Nebaghiye"
            },
            {
              "ar": "تنغادج",
              "fr": "Tenghadej"
            },
            {
              "ar": "الميسر",
              "fr": "El Mouyessar"
            }
          ]
        },
        {
          "id": "MR062",
          "ar": "كرمسين",
          "fr": "Keur Macen",
          "neighborhoods": [
            {
              "ar": "كرمسين",
              "fr": "Keur Macen"
            },
            {
              "ar": "كرمسين",
              "fr": "Keurmacen"
            },
            {
              "ar": "انذياگو",
              "fr": "N'Diago"
            },
            {
              "ar": "امبلال",
              "fr": "M'Balal"
            }
          ]
        },
        {
          "id": "MR064",
          "ar": "واد الناقة",
          "fr": "Ouad Naga",
          "neighborhoods": [
            {
              "ar": "واد الناقة",
              "fr": "واد الناقة"
            },
            {
              "ar": "أولييگات",
              "fr": "Aouleiygat"
            },
            {
              "ar": "العارية",
              "fr": "El Ariye"
            }
          ]
        },
        {
          "id": "MR063",
          "ar": "المذرذرة",
          "fr": "Mederdra",
          "neighborhoods": [
            {
              "ar": "المذرذرة",
              "fr": "Mederdra"
            },
            {
              "ar": "بير تاورص",
              "fr": "Beir Taouress"
            },
            {
              "ar": "تاگيلالت",
              "fr": "Taguilalet"
            },
            {
              "ar": "الخط",
              "fr": "El Khat"
            },
            {
              "ar": "تيگنت (الجديد)",
              "fr": "Tiguent (El Jedide)"
            }
          ]
        },
        {
          "id": "MR065",
          "ar": "الركيز",
          "fr": "R'Kiz",
          "neighborhoods": [
            {
              "ar": "الركيز",
              "fr": "الركيز"
            },
            {
              "ar": "بوطلحية",
              "fr": "Boutalhaye"
            },
            {
              "ar": "بارين",
              "fr": "Bareine"
            }
          ]
        },
        {
          "id": "MR066",
          "ar": "روصو",
          "fr": "Rosso",
          "neighborhoods": [
            {
              "ar": "روصو",
              "fr": "روصو"
            },
            {
              "ar": "جدل الموقن",
              "fr": "Jedrel Mouhguen"
            },
            {
              "ar": "جدل الموقن",
              "fr": "Jedrel Mouhguen"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "حي الكورنيش",
              "fr": "Corniche"
            }
          ]
        }
      ]
    },
    {
      "id": "MR05",
      "ar": "البراكنة",
      "fr": "Brakna",
      "cities": [
        {
          "id": "MR054",
          "ar": "مقطع لحجار",
          "fr": "Magtalahjar",
          "neighborhoods": [
            {
              "ar": "مقطع لحجار",
              "fr": "Magtalahjar"
            },
            {
              "ar": "صنگراوه",
              "fr": "Sangrave"
            },
            {
              "ar": "جونابه",
              "fr": "Djonabe"
            },
            {
              "ar": "واد عمور",
              "fr": "Ouad Emmour"
            }
          ]
        },
        {
          "id": "MR052",
          "ar": "بابابي",
          "fr": "Bababé",
          "neighborhoods": [
            {
              "ar": "بابابي",
              "fr": "Bababé"
            },
            {
              "ar": "الفريع",
              "fr": "El Verae"
            },
            {
              "ar": "آيريه امبار",
              "fr": "Aéré M'Bar"
            }
          ]
        },
        {
          "id": "MR056",
          "ar": "مال",
          "fr": "Maal",
          "neighborhoods": [
            {
              "ar": "مال",
              "fr": "Maal"
            },
            {
              "ar": "رومد",
              "fr": "Roumed"
            },
            {
              "ar": "الواد لبيض",
              "fr": "Elwad Lebiadh"
            },
            {
              "ar": "بورات",
              "fr": "Bourat"
            },
            {
              "ar": "جلوار",
              "fr": "Djelwar"
            }
          ]
        },
        {
          "id": "MR055",
          "ar": "امباني",
          "fr": "M'Bagne",
          "neighborhoods": [
            {
              "ar": "امباني",
              "fr": "امباني"
            },
            {
              "ar": "نيابينا",
              "fr": "Niabina"
            },
            {
              "ar": "ادباي الحجاج",
              "fr": "Edebaye El Hejjaj"
            },
            {
              "ar": "باگودين",
              "fr": "Bagodine"
            }
          ]
        },
        {
          "id": "MR051",
          "ar": "ألاك",
          "fr": "Aleg",
          "neighborhoods": [
            {
              "ar": "ألاك",
              "fr": "ألاك"
            },
            {
              "ar": "شگار",
              "fr": "Chegar"
            },
            {
              "ar": "بوهديـدة",
              "fr": "Bouhdida"
            },
            {
              "ar": "اغشورگيت",
              "fr": "Aghchourguit"
            }
          ]
        },
        {
          "id": "MR053",
          "ar": "بوغي",
          "fr": "Boghé",
          "neighborhoods": [
            {
              "ar": "بوغي",
              "fr": "Boghé"
            },
            {
              "ar": "دار العافية",
              "fr": "Dar El Aviye"
            },
            {
              "ar": "دار البركة",
              "fr": "Dar El Barke"
            },
            {
              "ar": "ولد بيرام",
              "fr": "Ould Biram"
            }
          ]
        }
      ]
    },
    {
      "id": "MR04",
      "ar": "كوركول",
      "fr": "Gorgol",
      "cities": [
        {
          "id": "MR041",
          "ar": "كيهيدي",
          "fr": "Kaedi",
          "neighborhoods": [
            {
              "ar": "كيهيدي",
              "fr": "Kaedi"
            },
            {
              "ar": "نيري والو",
              "fr": "Néré Walo"
            },
            {
              "ar": "جيهول",
              "fr": "Djewol"
            },
            {
              "ar": "تغمادي",
              "fr": "Toghomadi"
            },
            {
              "ar": "تيفوندي سيفي",
              "fr": "Tifondé Civé"
            }
          ]
        },
        {
          "id": "MR043",
          "ar": "امبود",
          "fr": "M'Bout",
          "neighborhoods": [
            {
              "ar": "امبود",
              "fr": "M'Bout"
            },
            {
              "ar": "امبود",
              "fr": "M'Boud"
            },
            {
              "ar": "تيكوبرا",
              "fr": "Tikobra"
            },
            {
              "ar": "ترنگل أهل مولاي علي",
              "fr": "Terenguel Ehel Moulaye Ely"
            },
            {
              "ar": "انجاجبني گندگا",
              "fr": "N'Djadjbenni Gandéga"
            },
            {
              "ar": "ادباي أهل گلاّي",
              "fr": "Edebaye Ehel Guelaye"
            },
            {
              "ar": "فوم لگليته",
              "fr": "Voum Legleite"
            },
            {
              "ar": "شلخت طياب",
              "fr": "Chelkhet Tiyab"
            },
            {
              "ar": "لحراش",
              "fr": "Lahrach"
            },
            {
              "ar": "سوف",
              "fr": "Souve"
            }
          ]
        },
        {
          "id": "MR045",
          "ar": "لكصيبة",
          "fr": "Lexeibe 1",
          "neighborhoods": [
            {
              "ar": "لكصيبة",
              "fr": "Lexeibe 1"
            },
            {
              "ar": "لكصيبة 1",
              "fr": "Lexeiba 1"
            },
            {
              "ar": "بتنگال",
              "fr": "Betengal"
            },
            {
              "ar": "طلحاية",
              "fr": "Talhaye"
            },
            {
              "ar": "گانكي",
              "fr": "Ganki"
            }
          ]
        },
        {
          "id": "MR042",
          "ar": "مقامة",
          "fr": "Maghama",
          "neighborhoods": [
            {
              "ar": "مقامة",
              "fr": "مقامة"
            },
            {
              "ar": "دو",
              "fr": "Doo"
            },
            {
              "ar": "دولول سيفي",
              "fr": "Dolol Civé"
            },
            {
              "ar": "بيلوگت لتام",
              "fr": "Beilouguet Litame"
            },
            {
              "ar": "فريا لتام",
              "fr": "Vrea Litame"
            },
            {
              "ar": "تولل",
              "fr": "Toulel"
            },
            {
              "ar": "ساگني",
              "fr": "Sagné"
            },
            {
              "ar": "والي جانتانگ",
              "fr": "Wali Djantang"
            }
          ]
        },
        {
          "id": "MR044",
          "ar": "مونكل",
          "fr": "Mounguel",
          "neighborhoods": [
            {
              "ar": "مونكل",
              "fr": "Mounguel"
            },
            {
              "ar": "باثت مويت",
              "fr": "Bathet Moït"
            },
            {
              "ar": "بوخل",
              "fr": "Bokhol"
            },
            {
              "ar": "ملزم تيشت",
              "fr": "Melzem Teichet"
            },
            {
              "ar": "ازگيلم طياب",
              "fr": "Azgueilem Tiyab"
            }
          ]
        }
      ]
    },
    {
      "id": "MR03",
      "ar": "لعصابة",
      "fr": "Assaba",
      "cities": [
        {
          "id": "MR033",
          "ar": "كرو",
          "fr": "Guerou",
          "neighborhoods": [
            {
              "ar": "كرو",
              "fr": "كرو"
            },
            {
              "ar": "اوديي جريد",
              "fr": "Oudeiy Jrid"
            },
            {
              "ar": "الغيرة",
              "fr": "El Ghaira"
            },
            {
              "ar": "كامور",
              "fr": "Kamour"
            }
          ]
        },
        {
          "id": "MR035",
          "ar": "كيفة",
          "fr": "Kiffa",
          "neighborhoods": [
            {
              "ar": "كيفة",
              "fr": "كيفة"
            },
            {
              "ar": "انواملين",
              "fr": "Nouamlein"
            },
            {
              "ar": "اغورات",
              "fr": "Aghorat"
            },
            {
              "ar": "الملگه",
              "fr": "El Melgue"
            },
            {
              "ar": "كوروجل",
              "fr": "Kouroudjel"
            },
            {
              "ar": "لگران",
              "fr": "Legrane"
            }
          ]
        },
        {
          "id": "MR032",
          "ar": "بومديد",
          "fr": "Boumdeid",
          "neighborhoods": [
            {
              "ar": "بومديد",
              "fr": "بومديد"
            },
            {
              "ar": "حسي تين",
              "fr": "Hseiy Tin"
            },
            {
              "ar": "لفتح",
              "fr": "Lavtah"
            }
          ]
        },
        {
          "id": "MR034",
          "ar": "كنكوصة",
          "fr": "Kankoussa",
          "neighborhoods": [
            {
              "ar": "كنكوصة",
              "fr": "Kankoussa"
            },
            {
              "ar": "ساني",
              "fr": "Sani"
            },
            {
              "ar": "بلجميل",
              "fr": "Blajmil"
            },
            {
              "ar": "تناها",
              "fr": "Tenaha"
            },
            {
              "ar": "حامد",
              "fr": "Hamed"
            }
          ]
        },
        {
          "id": "MR031",
          "ar": "باركيول",
          "fr": "Barkéol",
          "neighborhoods": [
            {
              "ar": "باركيول",
              "fr": "Barkéol"
            },
            {
              "ar": "باركيول",
              "fr": "Barkeiwel"
            },
            {
              "ar": "گللر",
              "fr": "Gueller"
            },
            {
              "ar": "لبحير",
              "fr": "Lebheir"
            },
            {
              "ar": "لعيسي",
              "fr": "Laweissi"
            },
            {
              "ar": "داغفگ",
              "fr": "Daghveg"
            },
            {
              "ar": "الغبراء",
              "fr": "El Ghabra"
            },
            {
              "ar": "ارظيظية",
              "fr": "R'Dheidhie"
            },
            {
              "ar": "بو لأهراث",
              "fr": "Bou Lahrath"
            }
          ]
        }
      ]
    },
    {
      "id": "MR01",
      "ar": "الحوض الشرقي",
      "fr": "Hodh Chargui",
      "cities": [
        {
          "id": "MR013",
          "ar": "جكني",
          "fr": "Djiguenni",
          "neighborhoods": [
            {
              "ar": "جكني",
              "fr": "Djiguenni"
            },
            {
              "ar": "المبروك 1",
              "fr": "El Mabrouk 1"
            },
            {
              "ar": "فيرني",
              "fr": "Feirenni"
            },
            {
              "ar": "بنعمان",
              "fr": "Beneamane"
            },
            {
              "ar": "عوينة ازبل",
              "fr": "Aoueinat Ez Bel"
            },
            {
              "ar": "غليگ أهل بي",
              "fr": "Ghlig Ehel Beye"
            },
            {
              "ar": "قصر البركة",
              "fr": "Kasr El Barke"
            }
          ]
        },
        {
          "id": "MR018",
          "ar": "عدل بگرو",
          "fr": "Adel Bagrou",
          "neighborhoods": [
            {
              "ar": "عدل بگرو",
              "fr": "عدل بگرو"
            },
            {
              "ar": "المسگول",
              "fr": "Elmessgoul"
            },
            {
              "ar": "سيفان",
              "fr": "Sivane"
            }
          ]
        },
        {
          "id": "MR015",
          "ar": "ولاتة",
          "fr": "Oualata",
          "neighborhoods": [
            {
              "ar": "ولاتة",
              "fr": "ولاتة"
            },
            {
              "ar": "الباطن",
              "fr": "Elbatene"
            },
            {
              "ar": "الباطن",
              "fr": "Elbatene"
            },
            {
              "ar": "الحي القديم",
              "fr": "Vieille ville"
            }
          ]
        },
        {
          "id": "MR017",
          "ar": "انبيكت لحواش",
          "fr": "N'Beiket Lehwach",
          "neighborhoods": [
            {
              "ar": "انبيكت لحواش",
              "fr": "Nbeikett Lehwache"
            },
            {
              "ar": "انبيكت لحواش",
              "fr": "Nbeikett Lehwache"
            },
            {
              "ar": "المركز",
              "fr": "Centre"
            }
          ]
        },
        {
          "id": "MR016",
          "ar": "تمبدغة",
          "fr": "Timbédra",
          "neighborhoods": [
            {
              "ar": "تمبدغة",
              "fr": "Timbédra"
            },
            {
              "ar": "تمبدغة",
              "fr": "Tembedgha"
            },
            {
              "ar": "اطويل 1",
              "fr": "Touil 1"
            },
            {
              "ar": "كمبي صالح",
              "fr": "Koumbi Saleh"
            },
            {
              "ar": "بوستيل",
              "fr": "Bousteile"
            },
            {
              "ar": "حاسي امهدي",
              "fr": "Hassi M'Hadi"
            }
          ]
        },
        {
          "id": "MR012",
          "ar": "باسكنو",
          "fr": "Bassiknou",
          "neighborhoods": [
            {
              "ar": "باسكنو",
              "fr": "Bassiknou"
            },
            {
              "ar": "باسكنو",
              "fr": "Basseknou"
            },
            {
              "ar": "المگفة",
              "fr": "El Megve"
            },
            {
              "ar": "فسال",
              "fr": "Vessale"
            },
            {
              "ar": "الظهر",
              "fr": "Dhar"
            }
          ]
        },
        {
          "id": "MR014",
          "ar": "النعمة",
          "fr": "Néma",
          "neighborhoods": [
            {
              "ar": "النعمة",
              "fr": "Néma"
            },
            {
              "ar": "اشميم",
              "fr": "Achemime"
            },
            {
              "ar": "جريف",
              "fr": "Jreif"
            },
            {
              "ar": "بانگو",
              "fr": "Bangou"
            },
            {
              "ar": "حاسي اتيل",
              "fr": "Hassi Etile"
            },
            {
              "ar": "ام افنادش",
              "fr": "Oum Avnadech"
            },
            {
              "ar": "المبروك 2",
              "fr": "El Mabrouk 2"
            },
            {
              "ar": "بريبافات",
              "fr": "Beribavat"
            },
            {
              "ar": "نوال",
              "fr": "Noual"
            },
            {
              "ar": "اگوينيت",
              "fr": "Agoueinit"
            }
          ]
        },
        {
          "id": "MR011",
          "ar": "آمرج",
          "fr": "Amourj",
          "neighborhoods": [
            {
              "ar": "آمرج",
              "fr": "آمرج"
            },
            {
              "ar": "ام اشيش",
              "fr": "Oum Echeich"
            },
            {
              "ar": "بوگادوم",
              "fr": "Bougadoum"
            },
            {
              "ar": "جيگي",
              "fr": "Djigui"
            },
            {
              "ar": "لگدور",
              "fr": "Legdour"
            }
          ]
        }
      ]
    },
    {
      "id": "MR02",
      "ar": "الحوض الغربي",
      "fr": "Hodh El Gharbi",
      "cities": [
        {
          "id": "MR023",
          "ar": "تامشكط",
          "fr": "Tamchekett",
          "neighborhoods": [
            {
              "ar": "تامشكط",
              "fr": "تامشكط"
            },
            {
              "ar": "المبروك 3",
              "fr": "El Mabrouk 3"
            },
            {
              "ar": "راضي",
              "fr": "Radhi"
            },
            {
              "ar": "گطاع تيدوم",
              "fr": "Guetae-Teidoume"
            },
            {
              "ar": "سافا",
              "fr": "Sava"
            }
          ]
        },
        {
          "id": "MR021",
          "ar": "العيون",
          "fr": "Aïoun",
          "neighborhoods": [
            {
              "ar": "العيون",
              "fr": "Aïoun"
            },
            {
              "ar": "عيون العتروس",
              "fr": "Aïoun El Atrouss"
            },
            {
              "ar": "انسافني",
              "fr": "N'Savenni"
            },
            {
              "ar": "دويرار",
              "fr": "Doueirare"
            },
            {
              "ar": "تن حمادي",
              "fr": "Ten Hamadi"
            },
            {
              "ar": "بنعمان",
              "fr": "Beneamane"
            },
            {
              "ar": "اجرت",
              "fr": "Egjert"
            },
            {
              "ar": "ام لحيض",
              "fr": "Oum Lahyadh"
            }
          ]
        },
        {
          "id": "MR022",
          "ar": "كوبني",
          "fr": "Kobeni",
          "neighborhoods": [
            {
              "ar": "كوبني",
              "fr": "كوبني"
            },
            {
              "ar": "حاسي أهل أحمد بشنه",
              "fr": "Hassi Ehel Ahmed Bechne"
            },
            {
              "ar": "تمزين",
              "fr": "Timzine"
            },
            {
              "ar": "لغليگ",
              "fr": "Leghlig"
            },
            {
              "ar": "گوگي زمال",
              "fr": "Gougui Zemmal"
            },
            {
              "ar": "موديبوغو",
              "fr": "Modibougou"
            },
            {
              "ar": "فولانية",
              "fr": "Voullaniya"
            }
          ]
        },
        {
          "id": "MR025",
          "ar": "اطويل",
          "fr": "Touil",
          "neighborhoods": [
            {
              "ar": "اطويل",
              "fr": "Touil"
            },
            {
              "ar": "اطويل 2",
              "fr": "Touil 2"
            },
            {
              "ar": "بغداد",
              "fr": "Baghdad"
            },
            {
              "ar": "ست",
              "fr": "Sett"
            },
            {
              "ar": "لحريجات",
              "fr": "Lehreijat"
            }
          ]
        },
        {
          "id": "MR024",
          "ar": "الطينطان",
          "fr": "Tintane",
          "neighborhoods": [
            {
              "ar": "الطينطان",
              "fr": "Tintan"
            },
            {
              "ar": "حاسي عبد الله",
              "fr": "Hassi Abdallah"
            },
            {
              "ar": "عوينة ثل",
              "fr": "Aweinat Thalle"
            },
            {
              "ar": "عين فارب",
              "fr": "Aïn Varbe"
            },
            {
              "ar": "اغرغر",
              "fr": "Egharghar"
            },
            {
              "ar": "ديف ا",
              "fr": "Dev-a"
            }
          ]
        }
      ]
    },
    {
      "id": "MR07",
      "ar": "أدرار",
      "fr": "Adrar",
      "cities": [
        {
          "id": "MR074",
          "ar": "وادان",
          "fr": "Ouadane",
          "neighborhoods": [
            {
              "ar": "وادان",
              "fr": "وادان"
            },
            {
              "ar": "الحي القديم",
              "fr": "Vieille ville"
            },
            {
              "ar": "حي القصر",
              "fr": "Quartier du Ksar"
            }
          ]
        },
        {
          "id": "MR072",
          "ar": "أطار",
          "fr": "Atar",
          "neighborhoods": [
            {
              "ar": "أطار",
              "fr": "أطار"
            },
            {
              "ar": "عين أهل تاية",
              "fr": "Aïn Ehel Taya"
            },
            {
              "ar": "طواز",
              "fr": "Tawaz"
            },
            {
              "ar": "شوم",
              "fr": "Choum"
            },
            {
              "ar": "أغنمريت",
              "fr": "Aghnomrit"
            },
            {
              "ar": "كنوال",
              "fr": "Kenewal"
            },
            {
              "ar": "كرن الكصبة",
              "fr": "Garn El Gasba"
            },
            {
              "ar": "تينيري",
              "fr": "Tineré"
            },
            {
              "ar": "أتويرسات",
              "fr": "Toueyrisat"
            },
            {
              "ar": "أكويكه",
              "fr": "Akwik"
            },
            {
              "ar": "أمباركه",
              "fr": "M’Barka"
            },
            {
              "ar": "أتويفنده",
              "fr": "Toueyvindé"
            },
            {
              "ar": "الظُلعة",
              "fr": "Ed-Dhal’a"
            },
            {
              "ar": "لحسينية",
              "fr": "Lahsainiya"
            },
            {
              "ar": "الصنكة",
              "fr": "Es-Sanka"
            },
            {
              "ar": "افريقيا",
              "fr": "Afrique"
            },
            {
              "ar": "الدايرة",
              "fr": "Ed-Daira"
            },
            {
              "ar": "الحي العسكري",
              "fr": "Quartier militaire"
            },
            {
              "ar": "كومبرا",
              "fr": "Koumbra"
            }
          ]
        },
        {
          "id": "MR071",
          "ar": "أوجفت",
          "fr": "Aoujeft",
          "neighborhoods": [
            {
              "ar": "أوجفت",
              "fr": "أوجفت"
            },
            {
              "ar": "معدن",
              "fr": "Maeden"
            },
            {
              "ar": "انتيرگنت",
              "fr": "N'Teirguent"
            },
            {
              "ar": "المداح",
              "fr": "El Medah"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            }
          ]
        },
        {
          "id": "MR073",
          "ar": "شنقيط",
          "fr": "Chinguitti",
          "neighborhoods": [
            {
              "ar": "شنقيط",
              "fr": "Chinguitti"
            },
            {
              "ar": "عين سفرة",
              "fr": "Aïn Savra"
            },
            {
              "ar": "شنقيط المدينة",
              "fr": "Chinguetti ville"
            },
            {
              "ar": "الحي القديم",
              "fr": "Vieille ville"
            },
            {
              "ar": "حي المكتبات",
              "fr": "Quartier des bibliothèques"
            },
            {
              "ar": "عين سفرة",
              "fr": "Aïn Savra"
            }
          ]
        }
      ]
    },
    {
      "id": "MR09",
      "ar": "تكانت",
      "fr": "Tagant",
      "cities": [
        {
          "id": "MR091",
          "ar": "المجرية",
          "fr": "Moudjeria",
          "neighborhoods": [
            {
              "ar": "المجرية",
              "fr": "Moudjeria"
            },
            {
              "ar": "انبيكه",
              "fr": "N'Beike"
            },
            {
              "ar": "سودود",
              "fr": "Soudoud"
            },
            {
              "ar": "تجكجة المركز",
              "fr": "Tidjikja Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Administratif"
            },
            {
              "ar": "حي النخيل",
              "fr": "Palmeraie"
            }
          ]
        },
        {
          "id": "MR092",
          "ar": "تيشيت",
          "fr": "Tichit",
          "neighborhoods": [
            {
              "ar": "تيشيت",
              "fr": "Tichit"
            },
            {
              "ar": "الخشب",
              "fr": "Lekhcheb"
            },
            {
              "ar": "تيشيت",
              "fr": "Tichit"
            },
            {
              "ar": "الخشب",
              "fr": "Lekhcheb"
            },
            {
              "ar": "الحي القديم",
              "fr": "Vieille ville"
            }
          ]
        },
        {
          "id": "MR093",
          "ar": "تجكجة",
          "fr": "Tidjikja",
          "neighborhoods": [
            {
              "ar": "تجكجة",
              "fr": "Tidjikja"
            },
            {
              "ar": "تجكجة",
              "fr": "Tidjikdja"
            },
            {
              "ar": "الواحات",
              "fr": "El Wahat"
            },
            {
              "ar": "تنصيگ",
              "fr": "Tensigh"
            },
            {
              "ar": "بوبكر بن عامر",
              "fr": "Boubacar Ben Amer"
            },
            {
              "ar": "لحسيرة",
              "fr": "Lehsira"
            },
            {
              "ar": "المجرية",
              "fr": "Moudjeria"
            },
            {
              "ar": "المركز",
              "fr": "Centre"
            },
            {
              "ar": "الحي السكني",
              "fr": "Résidentiel"
            }
          ]
        }
      ]
    },
    {
      "id": "MR11",
      "ar": "تيرس زمور",
      "fr": "Tiris Zemmour",
      "cities": [
        {
          "id": "MR111",
          "ar": "بير أم اكرين",
          "fr": "Bir Moughrein",
          "neighborhoods": [
            {
              "ar": "بير أم اكرين",
              "fr": "Birmoughrein"
            },
            {
              "ar": "بير أم اكرين المركز",
              "fr": "Bir Moghrein Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي المطار",
              "fr": "Quartier de l’aéroport"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            }
          ]
        },
        {
          "id": "MR113",
          "ar": "ازويرات",
          "fr": "Zoueirat",
          "neighborhoods": [
            {
              "ar": "ازويرات",
              "fr": "Zoueirat"
            },
            {
              "ar": "ازويرات المركز",
              "fr": "Zouérat Centre"
            },
            {
              "ar": "الهييت",
              "fr": "El Heit"
            },
            {
              "ar": "الهاي الشمالي",
              "fr": "Hait Nord"
            },
            {
              "ar": "حي 600 وحدة سكنية",
              "fr": "Cité 600 logements"
            },
            {
              "ar": "حي الترحيل",
              "fr": "Hay Et-Tarhil"
            },
            {
              "ar": "باكر ما سالا",
              "fr": "Bakar Ma Sala"
            },
            {
              "ar": "حي اسنيم",
              "fr": "Cité SNIM"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
            },
            {
              "ar": "حي العمال",
              "fr": "Quartier des travailleurs"
            },
            {
              "ar": "حي المطار",
              "fr": "Quartier de l’aéroport"
            }
          ]
        },
        {
          "id": "MR112",
          "ar": "افديرك",
          "fr": "F'Deirick",
          "neighborhoods": [
            {
              "ar": "افديرك",
              "fr": "F'Deirick"
            },
            {
              "ar": "افديرك المركز",
              "fr": "F’Dérik Centre"
            },
            {
              "ar": "الحي العتيق",
              "fr": "Quartier antique"
            },
            {
              "ar": "حي التعدين",
              "fr": "Quartier minier"
            },
            {
              "ar": "حي المحطة",
              "fr": "Quartier de la gare"
            },
            {
              "ar": "حي السكن",
              "fr": "Quartier résidentiel"
            }
          ]
        }
      ]
    },
    {
      "id": "MR12",
      "ar": "إينشيري",
      "fr": "Inchiri",
      "cities": [
        {
          "id": "MR122",
          "ar": "بنشاب",
          "fr": "Bennechab",
          "neighborhoods": [
            {
              "ar": "بنشاب",
              "fr": "Bennechab"
            },
            {
              "ar": "محيجرات",
              "fr": "Mheijrat"
            },
            {
              "ar": "بنشاب",
              "fr": "Bennechab"
            },
            {
              "ar": "محيجرات",
              "fr": "Mheijrat"
            }
          ]
        },
        {
          "id": "MR121",
          "ar": "أكجوجت",
          "fr": "Akjoujt",
          "neighborhoods": [
            {
              "ar": "أكجوجت",
              "fr": "أكجوجت"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي التعدين",
              "fr": "Quartier minier"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            }
          ]
        }
      ]
    },
    {
      "id": "MR10",
      "ar": "كيدي ماغا",
      "fr": "Guidimagha",
      "cities": [
        {
          "id": "MR104",
          "ar": "ومبو",
          "fr": "Wompou",
          "neighborhoods": [
            {
              "ar": "ومبو",
              "fr": "ومبو"
            },
            {
              "ar": "اگوينيت",
              "fr": "Agoueinitt"
            },
            {
              "ar": "ايجار",
              "fr": "Ejar"
            },
            {
              "ar": "ساگني ديري",
              "fr": "Sagne Dieri"
            },
            {
              "ar": "آر",
              "fr": "Arr"
            }
          ]
        },
        {
          "id": "MR102",
          "ar": "سيليبابي",
          "fr": "Sélibaby",
          "neighborhoods": [
            {
              "ar": "سيليبابي",
              "fr": "Sélibabi"
            },
            {
              "ar": "ولد امبوني",
              "fr": "Ould M'Bonny"
            },
            {
              "ar": "تاشوط",
              "fr": "Tachout"
            },
            {
              "ar": "حاسي شگار",
              "fr": "Hassi Chegar"
            }
          ]
        },
        {
          "id": "MR103",
          "ar": "غابو",
          "fr": "Ghabou",
          "neighborhoods": [
            {
              "ar": "غابو",
              "fr": "غابو"
            },
            {
              "ar": "شليخة",
              "fr": "Chleikha"
            },
            {
              "ar": "ديوگونتو",
              "fr": "Diogountou"
            },
            {
              "ar": "بايديام",
              "fr": "Bayediam"
            },
            {
              "ar": "گوراي",
              "fr": "Gouraye"
            },
            {
              "ar": "صوفي",
              "fr": "Soufi"
            }
          ]
        },
        {
          "id": "MR101",
          "ar": "ولد ينج",
          "fr": "Ould Yengé",
          "neighborhoods": [
            {
              "ar": "ولد ينج",
              "fr": "Ould Yengé"
            },
            {
              "ar": "ليبللي",
              "fr": "Leebelli"
            },
            {
              "ar": "تكتاك",
              "fr": "Tektake"
            },
            {
              "ar": "دافوه",
              "fr": "Davoue"
            },
            {
              "ar": "بوانز",
              "fr": "Bouanz"
            },
            {
              "ar": "لهراج",
              "fr": "Lehraj"
            },
            {
              "ar": "لعوينات",
              "fr": "Leaweinat"
            }
          ]
        }
      ]
    }
  ]
};

  function wilayas() { return GEO.wilayas.slice(); }

  function citiesOf(wilayaId) {
    var w = GEO.wilayas.find(function (x) { return x.id === wilayaId || x.ar === wilayaId || x.fr === wilayaId; });
    return w ? w.cities.slice() : [];
  }

  function neighborhoodsOf(wilayaId, cityId) {
    var cities = citiesOf(wilayaId);
    var c = cities.find(function (x) { return x.id === cityId || x.ar === cityId || x.fr === cityId; });
    return c ? c.neighborhoods.slice() : [];
  }

  function findByListingLoc(loc) {
    var q = String(loc || '').trim();
    if (!q) return null;
    var i, j, k, w, c, n;
    for (i = 0; i < GEO.wilayas.length; i++) {
      w = GEO.wilayas[i];
      if (w.ar === q || w.fr === q) return { wilaya: w.id, city: '', neighborhood: '' };
      for (j = 0; j < w.cities.length; j++) {
        c = w.cities[j];
        if (c.ar === q || c.fr === q) return { wilaya: w.id, city: c.id, neighborhood: '' };
        for (k = 0; k < c.neighborhoods.length; k++) {
          n = c.neighborhoods[k];
          if (n.ar === q || (n.fr && n.fr === q) || q.indexOf(n.ar) >= 0) {
            return { wilaya: w.id, city: c.id, neighborhood: n.ar };
          }
        }
      }
    }
    return null;
  }

  function label(item, fr) {
    if (!item) return '';
    return fr ? (item.fr || item.ar) : (item.ar || item.fr);
  }

  global.RizqMrGeo = {
    GEO: GEO,
    wilayas: wilayas,
    citiesOf: citiesOf,
    neighborhoodsOf: neighborhoodsOf,
    findByListingLoc: findByListingLoc,
    label: label
  };
})(typeof window !== 'undefined' ? window : this);
