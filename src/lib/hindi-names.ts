// Suggests a Hindi (Devanagari) name for an English menu item, word by word,
// using the way Indian menus usually write dish names ("Butter Naan" → "बटर नान").
// Returns null when any word is unknown, so we never guess wrongly.

const WORDS: Record<string, string> = {
  // Paan
  paan: "पान", pan: "पान", meetha: "मीठा", mitha: "मीठा", meethi: "मीठी", saada: "सादा", sada: "सादा", plain: "सादा",
  banarasi: "बनारसी", calcutta: "कलकत्ता", kolkata: "कोलकाता", maghai: "मघई", magai: "मघई", gulkand: "गुलकंद",
  saunf: "सौंफ", supari: "सुपारी", fire: "फायर", chocolate: "चॉकलेट", rose: "रोज़", special: "स्पेशल",
  // Tea & coffee
  chai: "चाय", tea: "चाय", masala: "मसाला", adrak: "अदरक", ginger: "अदरक", elaichi: "इलायची", kulhad: "कुल्हड़",
  cutting: "कटिंग", green: "ग्रीन", black: "ब्लैक", lemon: "लेमन", coffee: "कॉफ़ी", cold: "कोल्ड", hot: "हॉट",
  filter: "फ़िल्टर", cappuccino: "कैपुचीनो", latte: "लाटे", espresso: "एस्प्रेसो", mocha: "मोका", americano: "अमेरिकानो",
  iced: "आइस्ड", ice: "आइस", cream: "क्रीम",
  // Drinks
  lassi: "लस्सी", sweet: "स्वीट", salted: "नमकीन", namkeen: "नमकीन", mango: "मैंगो", chaas: "छाछ", buttermilk: "छाछ",
  shake: "शेक", shakes: "शेक", milkshake: "मिल्कशेक", milk: "मिल्क", badam: "बादाम", kesar: "केसर", pista: "पिस्ता",
  strawberry: "स्ट्रॉबेरी", vanilla: "वनीला", banana: "बनाना", oreo: "ओरियो", butterscotch: "बटरस्कॉच", kitkat: "किटकैट",
  juice: "जूस", fresh: "फ्रेश", lime: "लाइम", nimbu: "नींबू", soda: "सोडा", water: "वॉटर", mineral: "मिनरल",
  orange: "ऑरेंज", pineapple: "पाइनएप्पल", watermelon: "तरबूज़", mosambi: "मौसमी", coconut: "नारियल",
  drink: "ड्रिंक", drinks: "ड्रिंक", mojito: "मोजिटो", falooda: "फालूदा",
  // Breads
  naan: "नान", nan: "नान", roti: "रोटी", tandoori: "तंदूरी", rumali: "रुमाली", missi: "मिस्सी", lachha: "लच्छा",
  laccha: "लच्छा", paratha: "पराठा", parantha: "पराठा", kulcha: "कुलचा", amritsari: "अमृतसरी", garlic: "गार्लिक",
  bhature: "भटूरे", puri: "पूरी", poori: "पूरी", bread: "ब्रेड", toast: "टोस्ट", pav: "पाव", butter: "बटर", ghee: "घी",
  stuffed: "स्टफ्ड", tawa: "तवा",
  // Mains
  paneer: "पनीर", dal: "दाल", daal: "दाल", makhani: "मखनी", makhni: "मखनी", tadka: "तड़का", fry: "फ्राई",
  fried: "फ्राइड", aloo: "आलू", gobi: "गोभी", gobhi: "गोभी", matar: "मटर", mutter: "मटर", palak: "पालक",
  kadai: "कड़ाही", kadhai: "कड़ाही", shahi: "शाही", malai: "मलाई", kofta: "कोफ्ता", tikka: "टिक्का", chilli: "चिली",
  chili: "चिली", mushroom: "मशरूम", kaju: "काजू", curry: "करी", handi: "हांडी", dum: "दम", lababdar: "लबाबदार",
  bhurji: "भुर्जी", chana: "चना", chole: "छोले", rajma: "राजमा", kadhi: "कढ़ी", pakodi: "पकौड़ी", jeera: "जीरा",
  mix: "मिक्स", mixed: "मिक्स", veg: "वेज", vegetable: "वेजिटेबल", gravy: "ग्रेवी", dry: "ड्राई", jain: "जैन",
  desi: "देसी", thali: "थाली", raita: "रायता", salad: "सलाद", papad: "पापड़", sev: "सेव", tamatar: "टमाटर",
  tomato: "टमाटर", bhindi: "भिंडी", baingan: "बैंगन", bharta: "भर्ता", methi: "मेथी", corn: "कॉर्न",
  // Rice
  rice: "राइस", biryani: "बिरयानी", pulao: "पुलाव", khichdi: "खिचड़ी", steamed: "स्टीम्ड",
  // Snacks & Chinese
  samosa: "समोसा", kachori: "कचौरी", pakoda: "पकौड़ा", pakora: "पकौड़ा", pakode: "पकौड़े", bhaji: "भाजी",
  sandwich: "सैंडविच", grilled: "ग्रिल्ड", cheese: "चीज़", pizza: "पिज़्ज़ा", burger: "बर्गर", fries: "फ्राइज़",
  french: "फ्रेंच", spring: "स्प्रिंग", roll: "रोल", rolls: "रोल", momos: "मोमोज़", momo: "मोमो", soup: "सूप",
  manchurian: "मंचूरियन", noodles: "नूडल्स", chowmein: "चाउमीन", hakka: "हक्का", schezwan: "शेज़वान",
  szechuan: "शेज़वान", dosa: "डोसा", idli: "इडली", vada: "वड़ा", sambar: "सांभर", uttapam: "उत्तपम",
  chaat: "चाट", pani: "पानी", tikki: "टिक्की", maggi: "मैगी", pasta: "पास्ता", nachos: "नाचोज़",
  // Desserts
  gulab: "गुलाब", jamun: "जामुन", rasgulla: "रसगुल्ला", rasmalai: "रसमलाई", kheer: "खीर", halwa: "हलवा",
  gajar: "गाजर", moong: "मूंग", kulfi: "कुल्फी", jalebi: "जलेबी", rabri: "रबड़ी", rabdi: "रबड़ी", brownie: "ब्राउनी",
  katli: "कतली", barfi: "बर्फी", burfi: "बर्फी", ladoo: "लड्डू", laddu: "लड्डू", peda: "पेड़ा", gujiya: "गुझिया",
  sizzling: "सिज़लिंग", sundae: "संडे", cake: "केक", pastry: "पेस्ट्री",
  // Portions
  pc: "पीस", pcs: "पीस", piece: "पीस", pieces: "पीस", plate: "प्लेट", half: "हाफ़", full: "फ़ुल", small: "छोटा",
  large: "बड़ा", regular: "रेगुलर", medium: "मीडियम", family: "फैमिली", pack: "पैक", combo: "कॉम्बो", mini: "मिनी",
  jumbo: "जंबो", double: "डबल", single: "सिंगल", glass: "गिलास", cup: "कप", bottle: "बोतल", with: "के साथ",
  and: "और",
  // Non-veg (in case they are ever added)
  chicken: "चिकन", mutton: "मटन", fish: "फिश", egg: "अंडा", eggs: "अंडे", omelette: "ऑमलेट",
};

/** "Gulab Jamun (2 pc)" → "गुलाब जामुन (2 पीस)", or null if any word is unknown. */
export function suggestHindiName(english: string): string | null {
  const name = english.trim();
  if (!name) return null;
  // Keep spaces, digits and punctuation as they are; translate each word.
  const parts = name.split(/([A-Za-z]+)/);
  let translatedAny = false;
  const out = parts.map((part) => {
    if (!/^[A-Za-z]+$/.test(part)) return part;
    const hi = WORDS[part.toLowerCase()];
    if (!hi) return null;
    translatedAny = true;
    return hi;
  });
  if (!translatedAny || out.includes(null)) return null;
  return out.join("").replace(/\s+/g, " ").trim();
}
