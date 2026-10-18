/**
 * rizq_mr_geo.js — التقسيم الإداري لموريتانيا للبحث العقاري
 * الولاية → المدينة (مقاطعة) → الحي/المنطقة (بلدية + أحياء معروفة)
 * المصدر: openadmindata.org (15 ولاية / 63 مقاطعة / 238 بلدية) + تسميات عربية رسمية.
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
              "ar": "Tefragh Zeina",
              "fr": "Tefragh Zeina"
            },
            {
              "ar": "حي الدبلوماسيين",
              "fr": "حي الدبلوماسيين"
            },
            {
              "ar": "حي المرابطين",
              "fr": "حي المرابطين"
            },
            {
              "ar": "حي السعادة",
              "fr": "حي السعادة"
            },
            {
              "ar": "الطينطان (تفرغ زينة)",
              "fr": "الطينطان (تفرغ زينة)"
            },
            {
              "ar": "قرب دوار تفرغ زينة",
              "fr": "قرب دوار تفرغ زينة"
            },
            {
              "ar": "القطب",
              "fr": "القطب"
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
              "ar": "Teyaret",
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
              "ar": "Dar Naim",
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
            }
          ]
        },
        {
          "id": "MR153",
          "ar": "Riad",
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
              "ar": "Boulenouar",
              "fr": "Boulenouar"
            },
            {
              "ar": "Inal",
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
              "ar": "Tmeimichat",
              "fr": "Tmeimichat"
            },
            {
              "ar": "Nouamghar",
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
          "ar": "Tekane",
          "fr": "Tekane",
          "neighborhoods": [
            {
              "ar": "Teikane",
              "fr": "Teikane"
            },
            {
              "ar": "Chemame",
              "fr": "Chemame"
            },
            {
              "ar": "Teichteyat",
              "fr": "Teichteyat"
            },
            {
              "ar": "Lexelbe 2",
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
              "ar": "Elb Adress",
              "fr": "Elb Adress"
            },
            {
              "ar": "Ajoueir",
              "fr": "Ajoueir"
            },
            {
              "ar": "N'Teichet",
              "fr": "N'Teichet"
            },
            {
              "ar": "Nebaghiye",
              "fr": "Nebaghiye"
            },
            {
              "ar": "Tenghadej",
              "fr": "Tenghadej"
            },
            {
              "ar": "El Mouyessar",
              "fr": "El Mouyessar"
            }
          ]
        },
        {
          "id": "MR062",
          "ar": "Keur Macen",
          "fr": "Keur Macen",
          "neighborhoods": [
            {
              "ar": "Keurmacen",
              "fr": "Keurmacen"
            },
            {
              "ar": "N'Diago",
              "fr": "N'Diago"
            },
            {
              "ar": "M'Balal",
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
              "ar": "Aouleiygat",
              "fr": "Aouleiygat"
            },
            {
              "ar": "El Ariye",
              "fr": "El Ariye"
            }
          ]
        },
        {
          "id": "MR063",
          "ar": "Mederdra",
          "fr": "Mederdra",
          "neighborhoods": [
            {
              "ar": "Mederdra",
              "fr": "Mederdra"
            },
            {
              "ar": "Beir Taouress",
              "fr": "Beir Taouress"
            },
            {
              "ar": "Taguilalet",
              "fr": "Taguilalet"
            },
            {
              "ar": "El Khat",
              "fr": "El Khat"
            },
            {
              "ar": "Tiguent (El Jedide)",
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
              "ar": "Boutalhaye",
              "fr": "Boutalhaye"
            },
            {
              "ar": "Bareine",
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
              "ar": "Jedrel Mouhguen",
              "fr": "Jedrel Mouhguen"
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
          "ar": "Magtalahjar",
          "fr": "Magtalahjar",
          "neighborhoods": [
            {
              "ar": "Magtalahjar",
              "fr": "Magtalahjar"
            },
            {
              "ar": "Sangrave",
              "fr": "Sangrave"
            },
            {
              "ar": "Djonabe",
              "fr": "Djonabe"
            },
            {
              "ar": "Ouad Emmour",
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
              "ar": "Bababé",
              "fr": "Bababé"
            },
            {
              "ar": "El Verae",
              "fr": "El Verae"
            },
            {
              "ar": "Aéré M'Bar",
              "fr": "Aéré M'Bar"
            }
          ]
        },
        {
          "id": "MR056",
          "ar": "Maal",
          "fr": "Maal",
          "neighborhoods": [
            {
              "ar": "Maal",
              "fr": "Maal"
            },
            {
              "ar": "Roumed",
              "fr": "Roumed"
            },
            {
              "ar": "Elwad Lebiadh",
              "fr": "Elwad Lebiadh"
            },
            {
              "ar": "Bourat",
              "fr": "Bourat"
            },
            {
              "ar": "Djelwar",
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
              "ar": "Niabina",
              "fr": "Niabina"
            },
            {
              "ar": "Edebaye El Hejjaj",
              "fr": "Edebaye El Hejjaj"
            },
            {
              "ar": "Bagodine",
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
              "ar": "Chegar",
              "fr": "Chegar"
            },
            {
              "ar": "Bouhdida",
              "fr": "Bouhdida"
            },
            {
              "ar": "Aghchourguit",
              "fr": "Aghchourguit"
            }
          ]
        },
        {
          "id": "MR053",
          "ar": "Boghé",
          "fr": "Boghé",
          "neighborhoods": [
            {
              "ar": "Boghé",
              "fr": "Boghé"
            },
            {
              "ar": "Dar El Aviye",
              "fr": "Dar El Aviye"
            },
            {
              "ar": "Dar El Barke",
              "fr": "Dar El Barke"
            },
            {
              "ar": "Ould Biram",
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
          "ar": "Kaedi",
          "fr": "Kaedi",
          "neighborhoods": [
            {
              "ar": "Kaedi",
              "fr": "Kaedi"
            },
            {
              "ar": "Néré Walo",
              "fr": "Néré Walo"
            },
            {
              "ar": "Djewol",
              "fr": "Djewol"
            },
            {
              "ar": "Toghomadi",
              "fr": "Toghomadi"
            },
            {
              "ar": "Tifondé Civé",
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
              "ar": "M'Boud",
              "fr": "M'Boud"
            },
            {
              "ar": "Tikobra",
              "fr": "Tikobra"
            },
            {
              "ar": "Terenguel Ehel Moulaye Ely",
              "fr": "Terenguel Ehel Moulaye Ely"
            },
            {
              "ar": "N'Djadjbenni Gandéga",
              "fr": "N'Djadjbenni Gandéga"
            },
            {
              "ar": "Edebaye Ehel Guelaye",
              "fr": "Edebaye Ehel Guelaye"
            },
            {
              "ar": "Voum Legleite",
              "fr": "Voum Legleite"
            },
            {
              "ar": "Chelkhet Tiyab",
              "fr": "Chelkhet Tiyab"
            },
            {
              "ar": "Lahrach",
              "fr": "Lahrach"
            },
            {
              "ar": "Souve",
              "fr": "Souve"
            }
          ]
        },
        {
          "id": "MR045",
          "ar": "Lexeibe 1",
          "fr": "Lexeibe 1",
          "neighborhoods": [
            {
              "ar": "Lexeiba 1",
              "fr": "Lexeiba 1"
            },
            {
              "ar": "Betengal",
              "fr": "Betengal"
            },
            {
              "ar": "Talhaye",
              "fr": "Talhaye"
            },
            {
              "ar": "Ganki",
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
              "ar": "Doo",
              "fr": "Doo"
            },
            {
              "ar": "Dolol Civé",
              "fr": "Dolol Civé"
            },
            {
              "ar": "Beilouguet Litame",
              "fr": "Beilouguet Litame"
            },
            {
              "ar": "Vrea Litame",
              "fr": "Vrea Litame"
            },
            {
              "ar": "Toulel",
              "fr": "Toulel"
            },
            {
              "ar": "Sagné",
              "fr": "Sagné"
            },
            {
              "ar": "Wali Djantang",
              "fr": "Wali Djantang"
            }
          ]
        },
        {
          "id": "MR044",
          "ar": "Mounguel",
          "fr": "Mounguel",
          "neighborhoods": [
            {
              "ar": "Mounguel",
              "fr": "Mounguel"
            },
            {
              "ar": "Bathet Moït",
              "fr": "Bathet Moït"
            },
            {
              "ar": "Bokhol",
              "fr": "Bokhol"
            },
            {
              "ar": "Melzem Teichet",
              "fr": "Melzem Teichet"
            },
            {
              "ar": "Azgueilem Tiyab",
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
              "ar": "Oudeiy Jrid",
              "fr": "Oudeiy Jrid"
            },
            {
              "ar": "El Ghaira",
              "fr": "El Ghaira"
            },
            {
              "ar": "Kamour",
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
              "ar": "Nouamlein",
              "fr": "Nouamlein"
            },
            {
              "ar": "Aghorat",
              "fr": "Aghorat"
            },
            {
              "ar": "El Melgue",
              "fr": "El Melgue"
            },
            {
              "ar": "Kouroudjel",
              "fr": "Kouroudjel"
            },
            {
              "ar": "Legrane",
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
              "ar": "Hseiy Tin",
              "fr": "Hseiy Tin"
            },
            {
              "ar": "Lavtah",
              "fr": "Lavtah"
            }
          ]
        },
        {
          "id": "MR034",
          "ar": "Kankoussa",
          "fr": "Kankoussa",
          "neighborhoods": [
            {
              "ar": "Kankoussa",
              "fr": "Kankoussa"
            },
            {
              "ar": "Sani",
              "fr": "Sani"
            },
            {
              "ar": "Blajmil",
              "fr": "Blajmil"
            },
            {
              "ar": "Tenaha",
              "fr": "Tenaha"
            },
            {
              "ar": "Hamed",
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
              "ar": "Barkeiwel",
              "fr": "Barkeiwel"
            },
            {
              "ar": "Gueller",
              "fr": "Gueller"
            },
            {
              "ar": "Lebheir",
              "fr": "Lebheir"
            },
            {
              "ar": "Laweissi",
              "fr": "Laweissi"
            },
            {
              "ar": "Daghveg",
              "fr": "Daghveg"
            },
            {
              "ar": "El Ghabra",
              "fr": "El Ghabra"
            },
            {
              "ar": "R'Dheidhie",
              "fr": "R'Dheidhie"
            },
            {
              "ar": "Bou Lahrath",
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
          "ar": "Djiguenni",
          "fr": "Djiguenni",
          "neighborhoods": [
            {
              "ar": "Djiguenni",
              "fr": "Djiguenni"
            },
            {
              "ar": "El Mabrouk 1",
              "fr": "El Mabrouk 1"
            },
            {
              "ar": "Feirenni",
              "fr": "Feirenni"
            },
            {
              "ar": "Beneamane",
              "fr": "Beneamane"
            },
            {
              "ar": "Aoueinat Ez Bel",
              "fr": "Aoueinat Ez Bel"
            },
            {
              "ar": "Ghlig Ehel Beye",
              "fr": "Ghlig Ehel Beye"
            },
            {
              "ar": "Kasr El Barke",
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
              "ar": "Elmessgoul",
              "fr": "Elmessgoul"
            },
            {
              "ar": "Sivane",
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
              "ar": "Elbatene",
              "fr": "Elbatene"
            }
          ]
        },
        {
          "id": "MR017",
          "ar": "انبيكت لحواش",
          "fr": "N'Beiket Lehwach",
          "neighborhoods": [
            {
              "ar": "Nbeikett Lehwache",
              "fr": "Nbeikett Lehwache"
            }
          ]
        },
        {
          "id": "MR016",
          "ar": "تمبدغة",
          "fr": "Timbédra",
          "neighborhoods": [
            {
              "ar": "Tembedgha",
              "fr": "Tembedgha"
            },
            {
              "ar": "Touil 1",
              "fr": "Touil 1"
            },
            {
              "ar": "Koumbi Saleh",
              "fr": "Koumbi Saleh"
            },
            {
              "ar": "Bousteile",
              "fr": "Bousteile"
            },
            {
              "ar": "Hassi M'Hadi",
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
              "ar": "Basseknou",
              "fr": "Basseknou"
            },
            {
              "ar": "El Megve",
              "fr": "El Megve"
            },
            {
              "ar": "Vessale",
              "fr": "Vessale"
            },
            {
              "ar": "Dhar",
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
              "ar": "Néma",
              "fr": "Néma"
            },
            {
              "ar": "Achemime",
              "fr": "Achemime"
            },
            {
              "ar": "Jreif",
              "fr": "Jreif"
            },
            {
              "ar": "Bangou",
              "fr": "Bangou"
            },
            {
              "ar": "Hassi Etile",
              "fr": "Hassi Etile"
            },
            {
              "ar": "Oum Avnadech",
              "fr": "Oum Avnadech"
            },
            {
              "ar": "El Mabrouk 2",
              "fr": "El Mabrouk 2"
            },
            {
              "ar": "Beribavat",
              "fr": "Beribavat"
            },
            {
              "ar": "Noual",
              "fr": "Noual"
            },
            {
              "ar": "Agoueinit",
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
              "ar": "Oum Echeich",
              "fr": "Oum Echeich"
            },
            {
              "ar": "Bougadoum",
              "fr": "Bougadoum"
            },
            {
              "ar": "Djigui",
              "fr": "Djigui"
            },
            {
              "ar": "Legdour",
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
              "ar": "El Mabrouk 3",
              "fr": "El Mabrouk 3"
            },
            {
              "ar": "Radhi",
              "fr": "Radhi"
            },
            {
              "ar": "Guetae-Teidoume",
              "fr": "Guetae-Teidoume"
            },
            {
              "ar": "Sava",
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
              "ar": "Aïoun El Atrouss",
              "fr": "Aïoun El Atrouss"
            },
            {
              "ar": "N'Savenni",
              "fr": "N'Savenni"
            },
            {
              "ar": "Doueirare",
              "fr": "Doueirare"
            },
            {
              "ar": "Ten Hamadi",
              "fr": "Ten Hamadi"
            },
            {
              "ar": "Beneamane",
              "fr": "Beneamane"
            },
            {
              "ar": "Egjert",
              "fr": "Egjert"
            },
            {
              "ar": "Oum Lahyadh",
              "fr": "Oum Lahyadh"
            }
          ]
        },
        {
          "id": "MR022",
          "ar": "Kobeni",
          "fr": "Kobeni",
          "neighborhoods": [
            {
              "ar": "كوبني",
              "fr": "كوبني"
            },
            {
              "ar": "Hassi Ehel Ahmed Bechne",
              "fr": "Hassi Ehel Ahmed Bechne"
            },
            {
              "ar": "Timzine",
              "fr": "Timzine"
            },
            {
              "ar": "Leghlig",
              "fr": "Leghlig"
            },
            {
              "ar": "Gougui Zemmal",
              "fr": "Gougui Zemmal"
            },
            {
              "ar": "Modibougou",
              "fr": "Modibougou"
            },
            {
              "ar": "Voullaniya",
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
              "ar": "Touil 2",
              "fr": "Touil 2"
            },
            {
              "ar": "Baghdad",
              "fr": "Baghdad"
            },
            {
              "ar": "Sett",
              "fr": "Sett"
            },
            {
              "ar": "Lehreijat",
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
              "ar": "Tintan",
              "fr": "Tintan"
            },
            {
              "ar": "Hassi Abdallah",
              "fr": "Hassi Abdallah"
            },
            {
              "ar": "Aweinat Thalle",
              "fr": "Aweinat Thalle"
            },
            {
              "ar": "Aïn Varbe",
              "fr": "Aïn Varbe"
            },
            {
              "ar": "Egharghar",
              "fr": "Egharghar"
            },
            {
              "ar": "Dev-a",
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
              "ar": "Aïn Ehel Taya",
              "fr": "Aïn Ehel Taya"
            },
            {
              "ar": "Tawaz",
              "fr": "Tawaz"
            },
            {
              "ar": "Choum",
              "fr": "Choum"
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
              "ar": "Maeden",
              "fr": "Maeden"
            },
            {
              "ar": "N'Teirguent",
              "fr": "N'Teirguent"
            },
            {
              "ar": "El Medah",
              "fr": "El Medah"
            }
          ]
        },
        {
          "id": "MR073",
          "ar": "Chinguitti",
          "fr": "Chinguitti",
          "neighborhoods": [
            {
              "ar": "Chinguitti",
              "fr": "Chinguitti"
            },
            {
              "ar": "Aïn Savra",
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
          "ar": "Moudjeria",
          "fr": "Moudjeria",
          "neighborhoods": [
            {
              "ar": "Moudjeria",
              "fr": "Moudjeria"
            },
            {
              "ar": "N'Beike",
              "fr": "N'Beike"
            },
            {
              "ar": "Soudoud",
              "fr": "Soudoud"
            }
          ]
        },
        {
          "id": "MR092",
          "ar": "Tichit",
          "fr": "Tichit",
          "neighborhoods": [
            {
              "ar": "Tichit",
              "fr": "Tichit"
            },
            {
              "ar": "Lekhcheb",
              "fr": "Lekhcheb"
            }
          ]
        },
        {
          "id": "MR093",
          "ar": "تجكجة",
          "fr": "Tidjikja",
          "neighborhoods": [
            {
              "ar": "Tidjikdja",
              "fr": "Tidjikdja"
            },
            {
              "ar": "El Wahat",
              "fr": "El Wahat"
            },
            {
              "ar": "Tensigh",
              "fr": "Tensigh"
            },
            {
              "ar": "Boubacar Ben Amer",
              "fr": "Boubacar Ben Amer"
            },
            {
              "ar": "Lehsira",
              "fr": "Lehsira"
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
          "ar": "Bir Moughrein",
          "fr": "Bir Moughrein",
          "neighborhoods": [
            {
              "ar": "Birmoughrein",
              "fr": "Birmoughrein"
            }
          ]
        },
        {
          "id": "MR113",
          "ar": "Zoueirat",
          "fr": "Zoueirat",
          "neighborhoods": [
            {
              "ar": "Zoueirat",
              "fr": "Zoueirat"
            }
          ]
        },
        {
          "id": "MR112",
          "ar": "F'Deirick",
          "fr": "F'Deirick",
          "neighborhoods": [
            {
              "ar": "F'Deirick",
              "fr": "F'Deirick"
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
          "ar": "Bennechab",
          "fr": "Bennechab",
          "neighborhoods": [
            {
              "ar": "Bennechab",
              "fr": "Bennechab"
            },
            {
              "ar": "Mheijrat",
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
              "ar": "Agoueinitt",
              "fr": "Agoueinitt"
            },
            {
              "ar": "Ejar",
              "fr": "Ejar"
            },
            {
              "ar": "Sagne Dieri",
              "fr": "Sagne Dieri"
            },
            {
              "ar": "Arr",
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
              "ar": "Sélibabi",
              "fr": "Sélibabi"
            },
            {
              "ar": "Ould M'Bonny",
              "fr": "Ould M'Bonny"
            },
            {
              "ar": "Tachout",
              "fr": "Tachout"
            },
            {
              "ar": "Hassi Chegar",
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
              "ar": "Chleikha",
              "fr": "Chleikha"
            },
            {
              "ar": "Diogountou",
              "fr": "Diogountou"
            },
            {
              "ar": "Bayediam",
              "fr": "Bayediam"
            },
            {
              "ar": "Gouraye",
              "fr": "Gouraye"
            },
            {
              "ar": "Soufi",
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
              "ar": "Ould Yengé",
              "fr": "Ould Yengé"
            },
            {
              "ar": "Leebelli",
              "fr": "Leebelli"
            },
            {
              "ar": "Tektake",
              "fr": "Tektake"
            },
            {
              "ar": "Davoue",
              "fr": "Davoue"
            },
            {
              "ar": "Bouanz",
              "fr": "Bouanz"
            },
            {
              "ar": "Lehraj",
              "fr": "Lehraj"
            },
            {
              "ar": "Leaweinat",
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
