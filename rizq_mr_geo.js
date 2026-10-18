/**
 * rizq_mr_geo.js — التقسيم الإداري لموريتانيا للبحث العقاري
 * الولاية → المدينة (مقاطعة) → الحي/المنطقة
 * المصدر: openadmindata.org + أحياء حضرية معروفة
 * + أحياء/مواقع مخصصة من داشبورد سوق العقارات (localStorage).
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
              "fr": "Sebkha"
            },
            {
              "ar": "حي السبخة",
              "fr": "حي السبخة"
            },
            {
              "ar": "حي الميناء الغربي",
              "fr": "حي الميناء الغربي"
            },
            {
              "ar": "لبتار",
              "fr": "لبتار"
            },
            {
              "ar": "حي الرياض الغربي",
              "fr": "حي الرياض الغربي"
            },
            {
              "ar": "حي لبتار",
              "fr": "Lebtar"
            },
            {
              "ar": "السبخة المركز",
              "fr": "Sebkha Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Ksar"
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
            },
            {
              "ar": "حي السلام",
              "fr": "حي السلام"
            },
            {
              "ar": "حي السعادة",
              "fr": "حي السعادة"
            },
            {
              "ar": "لكصر المركز",
              "fr": "Ksar Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "ar": "قرب دوار تفرغ زينة",
              "fr": "قرب دوار تفرغ زينة"
            },
            {
              "ar": "حي راقٍ — تفرغ زينة",
              "fr": "حي راقٍ — تفرغ زينة"
            },
            {
              "ar": "القطب",
              "fr": "القطب"
            },
            {
              "ar": "سكال",
              "fr": "سكال"
            },
            {
              "ar": "حي النصر",
              "fr": "حي النصر"
            },
            {
              "ar": "تفرغ زينة المركز",
              "fr": "Tevragh Zeina Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "ar": "توجنين",
              "fr": "Toujounine"
            },
            {
              "ar": "حي توجنين",
              "fr": "حي توجنين"
            },
            {
              "ar": "حي السلام",
              "fr": "حي السلام"
            },
            {
              "ar": "حي الازدهار",
              "fr": "حي الازدهار"
            },
            {
              "ar": "حي النور",
              "fr": "حي النور"
            },
            {
              "ar": "تيارت",
              "fr": "Teyaret"
            },
            {
              "ar": "توجنين المركز",
              "fr": "Toujounine Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Dar Naïm"
            },
            {
              "ar": "حي دار النعيم",
              "fr": "حي دار النعيم"
            },
            {
              "ar": "حي الصداقة",
              "fr": "حي الصداقة"
            },
            {
              "ar": "حي الكويت",
              "fr": "حي الكويت"
            },
            {
              "ar": "حي النصر",
              "fr": "حي النصر"
            },
            {
              "ar": "دار النعيم المركز",
              "fr": "Dar Naïm Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
            }
          ]
        },
        {
          "id": "MR143",
          "ar": "تيارت",
          "fr": "Teyarett",
          "neighborhoods": [
            {
              "ar": "تيارت",
              "fr": "Teyarett"
            },
            {
              "ar": "حي تيارت",
              "fr": "حي تيارت"
            },
            {
              "ar": "حي المطار",
              "fr": "حي المطار"
            },
            {
              "ar": "حي الصناعة",
              "fr": "حي الصناعة"
            },
            {
              "ar": "توجنين",
              "fr": "توجنين"
            },
            {
              "ar": "تيارت المركز",
              "fr": "Teyarett Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Arafat"
            },
            {
              "ar": "حي عرفات",
              "fr": "حي عرفات"
            },
            {
              "ar": "حي الصداقة",
              "fr": "حي الصداقة"
            },
            {
              "ar": "حي الكويت",
              "fr": "حي الكويت"
            },
            {
              "ar": "حي 5 كيلومتر",
              "fr": "حي 5 كيلومتر"
            },
            {
              "ar": "عرفات المركز",
              "fr": "Arafat Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "El Mina"
            },
            {
              "ar": "سوق العاصمة",
              "fr": "سوق العاصمة"
            },
            {
              "ar": "حي الميناء",
              "fr": "حي الميناء"
            },
            {
              "ar": "حي الصيادين",
              "fr": "حي الصيادين"
            },
            {
              "ar": "الكورنيش",
              "fr": "الكورنيش"
            },
            {
              "ar": "الميناء المركز",
              "fr": "El Mina Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Riad"
            },
            {
              "ar": "حي الرياض",
              "fr": "حي الرياض"
            },
            {
              "ar": "الرياض الشمالي",
              "fr": "الرياض الشمالي"
            },
            {
              "ar": "الرياض الجنوبي",
              "fr": "الرياض الجنوبي"
            },
            {
              "ar": "حي السلام",
              "fr": "حي السلام"
            },
            {
              "ar": "الرياض المركز",
              "fr": "Riad Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Nouadhibou"
            },
            {
              "ar": "الميناء",
              "fr": "الميناء"
            },
            {
              "ar": "حي المطار",
              "fr": "حي المطار"
            },
            {
              "ar": "كراع النصراني",
              "fr": "كراع النصراني"
            },
            {
              "ar": "حي الصيادين",
              "fr": "حي الصيادين"
            },
            {
              "ar": "حي العمال",
              "fr": "حي العمال"
            },
            {
              "ar": "الحي الإداري",
              "fr": "الحي الإداري"
            },
            {
              "ar": "بولنوار",
              "fr": "بولنوار"
            },
            {
              "ar": "إينال",
              "fr": "إينال"
            },
            {
              "ar": "نواذيبو المركز",
              "fr": "Nouadhibou Centre"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Chami"
            },
            {
              "ar": "تميميشات",
              "fr": "تميميشات"
            },
            {
              "ar": "انوامغار",
              "fr": "انوامغار"
            },
            {
              "ar": "المركز",
              "fr": "المركز"
            },
            {
              "ar": "الشامي المركز",
              "fr": "Chami Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "تكانه المركز",
              "fr": "Tekane Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Boutilimit"
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
            },
            {
              "ar": "بوتلميت المركز",
              "fr": "Boutilimit Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "ar": "انذياگو",
              "fr": "N'Diago"
            },
            {
              "ar": "امبلال",
              "fr": "M'Balal"
            },
            {
              "ar": "كرمسين المركز",
              "fr": "Keur Macen Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Ouad Naga"
            },
            {
              "ar": "أولييگات",
              "fr": "Aouleiygat"
            },
            {
              "ar": "العارية",
              "fr": "El Ariye"
            },
            {
              "ar": "واد الناقة المركز",
              "fr": "Ouad Naga Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "المذرذرة المركز",
              "fr": "Mederdra Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "R'Kiz"
            },
            {
              "ar": "اركيز",
              "fr": "R'Kiz"
            },
            {
              "ar": "بوطلحية",
              "fr": "Boutalhaye"
            },
            {
              "ar": "بارين",
              "fr": "Bareine"
            },
            {
              "ar": "الركيز المركز",
              "fr": "R'Kiz Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Rosso"
            },
            {
              "ar": "روصو المركز",
              "fr": "روصو المركز"
            },
            {
              "ar": "جدل الموقن",
              "fr": "جدل الموقن"
            },
            {
              "ar": "حي السوق",
              "fr": "حي السوق"
            },
            {
              "ar": "حي الكورنيش",
              "fr": "حي الكورنيش"
            },
            {
              "ar": "حي الإدارة",
              "fr": "حي الإدارة"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "مقطع لحجار المركز",
              "fr": "Magtalahjar Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "بابابي المركز",
              "fr": "Bababé Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "مال المركز",
              "fr": "Maal Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "M'Bagne"
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
            },
            {
              "ar": "امباني المركز",
              "fr": "M'Bagne Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Aleg"
            },
            {
              "ar": "آلاك",
              "fr": "Aleg"
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
            },
            {
              "ar": "ألاك المركز",
              "fr": "Aleg Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "بوغي المركز",
              "fr": "Boghé Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "ar": "كيهيدي المركز",
              "fr": "كيهيدي المركز"
            },
            {
              "ar": "حي السوق",
              "fr": "حي السوق"
            },
            {
              "ar": "حي النهر",
              "fr": "حي النهر"
            },
            {
              "ar": "الحي الإداري",
              "fr": "الحي الإداري"
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
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "امبود المركز",
              "fr": "M'Bout Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "لكصيبة المركز",
              "fr": "Lexeibe 1 Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Maghama"
            },
            {
              "ar": "مغامة",
              "fr": "Maghama"
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
            },
            {
              "ar": "مقامة المركز",
              "fr": "Maghama Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "مونكل المركز",
              "fr": "Mounguel Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Guerou"
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
            },
            {
              "ar": "كرو المركز",
              "fr": "Guerou Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Kiffa"
            },
            {
              "ar": "كيفة المركز",
              "fr": "كيفة المركز"
            },
            {
              "ar": "حي السوق",
              "fr": "حي السوق"
            },
            {
              "ar": "الحي الإداري",
              "fr": "الحي الإداري"
            },
            {
              "ar": "حي السلام",
              "fr": "حي السلام"
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
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Boumdeid"
            },
            {
              "ar": "حسي تين",
              "fr": "Hseiy Tin"
            },
            {
              "ar": "لفتح",
              "fr": "Lavtah"
            },
            {
              "ar": "بومديد المركز",
              "fr": "Boumdeid Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "كنكوصة المركز",
              "fr": "Kankoussa Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "باركيول المركز",
              "fr": "Barkéol Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "جكني المركز",
              "fr": "Djiguenni Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Adel Bagrou"
            },
            {
              "ar": "المسگول",
              "fr": "Elmessgoul"
            },
            {
              "ar": "سيفان",
              "fr": "Sivane"
            },
            {
              "ar": "عدل بگرو المركز",
              "fr": "Adel Bagrou Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Oualata"
            },
            {
              "ar": "الباطن",
              "fr": "Elbatene"
            },
            {
              "ar": "الحي القديم",
              "fr": "Vieille ville"
            },
            {
              "ar": "ولاتة المركز",
              "fr": "Oualata Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
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
              "fr": "N'Beiket Lehwach"
            },
            {
              "ar": "المركز",
              "fr": "Centre"
            },
            {
              "ar": "انبيكت لحواش المركز",
              "fr": "N'Beiket Lehwach Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "تمبدغة المركز",
              "fr": "Timbédra Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "ar": "الظهر",
              "fr": "Dhar"
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
              "ar": "باسكنو المركز",
              "fr": "Bassiknou Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "ar": "النعمة المركز",
              "fr": "النعمة المركز"
            },
            {
              "ar": "حي السوق",
              "fr": "حي السوق"
            },
            {
              "ar": "الحي الإداري",
              "fr": "الحي الإداري"
            },
            {
              "ar": "حي السلام",
              "fr": "حي السلام"
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
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Amourj"
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
            },
            {
              "ar": "آمرج المركز",
              "fr": "Amourj Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Tamchekett"
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
            },
            {
              "ar": "تامشكط المركز",
              "fr": "Tamchekett Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "العيون المركز",
              "fr": "Aïoun Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Kobeni"
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
            },
            {
              "ar": "كوبني المركز",
              "fr": "Kobeni Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "اطويل المركز",
              "fr": "Touil Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Tintane"
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
            },
            {
              "ar": "الطينطان المركز",
              "fr": "Tintane Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Ouadane"
            },
            {
              "ar": "الحي القديم",
              "fr": "Vieille ville"
            },
            {
              "ar": "حي القصر",
              "fr": "Quartier du Ksar"
            },
            {
              "ar": "وادان المركز",
              "fr": "Ouadane Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
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
              "fr": "Atar"
            },
            {
              "ar": "أطار المركز",
              "fr": "أطار المركز"
            },
            {
              "ar": "أغنمريت",
              "fr": "أغنمريت"
            },
            {
              "ar": "كنوال",
              "fr": "كنوال"
            },
            {
              "ar": "كرن الكصبة",
              "fr": "كرن الكصبة"
            },
            {
              "ar": "تينيري",
              "fr": "تينيري"
            },
            {
              "ar": "أتويرسات",
              "fr": "أتويرسات"
            },
            {
              "ar": "أكويكه",
              "fr": "أكويكه"
            },
            {
              "ar": "أمباركه",
              "fr": "أمباركه"
            },
            {
              "ar": "أتويفنده",
              "fr": "أتويفنده"
            },
            {
              "ar": "الظُلعة",
              "fr": "الظُلعة"
            },
            {
              "ar": "لحسينية",
              "fr": "لحسينية"
            },
            {
              "ar": "الصنكة",
              "fr": "الصنكة"
            },
            {
              "ar": "افريقيا",
              "fr": "افريقيا"
            },
            {
              "ar": "الدايرة",
              "fr": "الدايرة"
            },
            {
              "ar": "الحي العسكري",
              "fr": "الحي العسكري"
            },
            {
              "ar": "كومبرا",
              "fr": "كومبرا"
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
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Aoujeft"
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
            },
            {
              "ar": "أوجفت المركز",
              "fr": "Aoujeft Centre"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "ar": "شنقيط المركز",
              "fr": "Chinguitti Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
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
            },
            {
              "ar": "المجرية المركز",
              "fr": "Moudjeria Centre"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "ar": "الحي القديم",
              "fr": "Vieille ville"
            },
            {
              "ar": "تيشيت المركز",
              "fr": "Tichit Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
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
            },
            {
              "ar": "تجكجة المركز",
              "fr": "Tidjikja Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Bir Moughrein"
            },
            {
              "ar": "بير أم اكرين المركز",
              "fr": "بير أم اكرين المركز"
            },
            {
              "ar": "الحي الإداري",
              "fr": "الحي الإداري"
            },
            {
              "ar": "حي المطار",
              "fr": "حي المطار"
            },
            {
              "ar": "الحي السكني",
              "fr": "الحي السكني"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "ازويرات المركز"
            },
            {
              "ar": "الهييت",
              "fr": "الهييت"
            },
            {
              "ar": "الهاي الشمالي",
              "fr": "الهاي الشمالي"
            },
            {
              "ar": "حي 600 وحدة سكنية",
              "fr": "حي 600 وحدة سكنية"
            },
            {
              "ar": "حي الترحيل",
              "fr": "حي الترحيل"
            },
            {
              "ar": "باكر ما سالا",
              "fr": "باكر ما سالا"
            },
            {
              "ar": "حي اسنيم",
              "fr": "حي اسنيم"
            },
            {
              "ar": "الحي القديم",
              "fr": "الحي القديم"
            },
            {
              "ar": "حي العمال",
              "fr": "حي العمال"
            },
            {
              "ar": "حي المطار",
              "fr": "حي المطار"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
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
              "fr": "افديرك المركز"
            },
            {
              "ar": "الحي العتيق",
              "fr": "الحي العتيق"
            },
            {
              "ar": "حي التعدين",
              "fr": "حي التعدين"
            },
            {
              "ar": "حي المحطة",
              "fr": "حي المحطة"
            },
            {
              "ar": "حي السكن",
              "fr": "حي السكن"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "ar": "بنشاب المركز",
              "fr": "Bennechab Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Akjoujt"
            },
            {
              "ar": "أكجوجت المركز",
              "fr": "أكجوجت المركز"
            },
            {
              "ar": "الحي الإداري",
              "fr": "الحي الإداري"
            },
            {
              "ar": "حي التعدين",
              "fr": "حي التعدين"
            },
            {
              "ar": "الحي السكني",
              "fr": "الحي السكني"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Wompou"
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
            },
            {
              "ar": "ومبو المركز",
              "fr": "Wompou Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Sélibaby"
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
            },
            {
              "ar": "سيليبابي المركز",
              "fr": "Sélibaby Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
              "fr": "Ghabou"
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
            },
            {
              "ar": "غابو المركز",
              "fr": "Ghabou Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
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
            },
            {
              "ar": "ولد ينج المركز",
              "fr": "Ould Yengé Centre"
            },
            {
              "ar": "الحي الإداري",
              "fr": "Quartier administratif"
            },
            {
              "ar": "حي السوق",
              "fr": "Quartier du marché"
            },
            {
              "ar": "الحي السكني",
              "fr": "Quartier résidentiel"
            },
            {
              "ar": "الحي القديم",
              "fr": "Ancien quartier"
            }
          ]
        }
      ]
    }
  ]
};
  var CUSTOM_KEY = 'rizq_estate_custom_quartiers';

  function wilayas() { return GEO.wilayas.slice(); }

  function citiesOf(wilayaId) {
    var w = GEO.wilayas.find(function (x) { return x.id === wilayaId || x.ar === wilayaId || x.fr === wilayaId; });
    return w ? w.cities.slice() : [];
  }

  function readCustoms() {
    try {
      var raw = (typeof localStorage !== 'undefined' && localStorage.getItem(CUSTOM_KEY)) || '[]';
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function writeCustoms(list) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(list.slice(0, 500)));
      }
    } catch (e) {}
  }

  function neighborhoodsOf(wilayaId, cityId) {
    var cities = citiesOf(wilayaId);
    var c = cities.find(function (x) { return x.id === cityId || x.ar === cityId || x.fr === cityId; });
    var base = c ? c.neighborhoods.slice() : [];
    var customs = readCustoms().filter(function (q) {
      return q && q.wilayaId === wilayaId && q.cityId === cityId && q.ar;
    }).map(function (q) { return { ar: q.ar, fr: q.fr || q.ar, custom: true }; });
    var seen = {};
    var outList = [];
    base.concat(customs).forEach(function (n) {
      var k = String(n.ar || '').trim();
      if (!k || seen[k]) return;
      seen[k] = 1;
      outList.push(n);
    });
    return outList;
  }

  function addCustomNeighborhood(entry) {
    var wilayaId = entry && entry.wilayaId;
    var cityId = entry && entry.cityId;
    var ar = String((entry && entry.ar) || '').trim();
    var fr = String((entry && entry.fr) || ar).trim();
    if (!wilayaId || !cityId || !ar) return { ok: false, error: 'missing' };
    var list = readCustoms();
    var exists = list.some(function (q) {
      return q.wilayaId === wilayaId && q.cityId === cityId && q.ar === ar;
    });
    if (!exists) {
      list.unshift({
        id: 'cq_' + Date.now(),
        wilayaId: wilayaId,
        cityId: cityId,
        ar: ar,
        fr: fr,
        createdAt: new Date().toISOString()
      });
      writeCustoms(list);
    }
    return { ok: true, list: list.filter(function (q) { return q.wilayaId === wilayaId && q.cityId === cityId; }) };
  }

  function listCustomNeighborhoods(wilayaId, cityId) {
    return readCustoms().filter(function (q) {
      if (wilayaId && q.wilayaId !== wilayaId) return false;
      if (cityId && q.cityId !== cityId) return false;
      return true;
    });
  }

  function removeCustomNeighborhood(id) {
    writeCustoms(readCustoms().filter(function (q) { return q.id !== id; }));
    return { ok: true };
  }

  function findByListingLoc(loc) {
    var q = String(loc || '').trim();
    if (!q) return null;
    var i, j, k, w, c, n, customs, ci;
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
    customs = readCustoms();
    for (ci = 0; ci < customs.length; ci++) {
      n = customs[ci];
      if (n.ar === q || (n.fr && n.fr === q) || q.indexOf(n.ar) >= 0) {
        return { wilaya: n.wilayaId, city: n.cityId, neighborhood: n.ar };
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
    CUSTOM_KEY: CUSTOM_KEY,
    wilayas: wilayas,
    citiesOf: citiesOf,
    neighborhoodsOf: neighborhoodsOf,
    addCustomNeighborhood: addCustomNeighborhood,
    listCustomNeighborhoods: listCustomNeighborhoods,
    removeCustomNeighborhood: removeCustomNeighborhood,
    findByListingLoc: findByListingLoc,
    label: label
  };
})(typeof window !== 'undefined' ? window : this);
