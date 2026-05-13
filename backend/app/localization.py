from __future__ import annotations

import re
from typing import Any

# Lightweight keyword sets for EN / TL / Bicolano detection
TL_KEYWORDS = {
    "ano", "saan", "magkano", "mga", "ng", "sa", "ang", "po", "opo", "hindi",
    "oo", "salamat", "pwede", "gusto", "kumain", "magpunta", "pumunta",
    "maglakbay", "pagkain", "tuluyan", "hotel", "murang", "malapit",
    "rekomendasyon", "maganda", "magandang", "beach", "dagat", "tubig",
    "tanawin", "tanawing", "tanaw", "kainan", "restawran", "presyo",
    "bayad", "oras", "bakasyon", "paglalakbay", "pasyalan", "pasyal",
    "turista", "bayan", "lungsod", "daan", "sakayan", "jeep", "tricycle",
    "bangka", "sakay", "byahe", "masarap", "masarap na", "matatagpuan",
    "nirarason", "libangan", "aktibidad", "tulog", "tulugan", "mura",
    "mahal", "magkakano", "nasaan", "nagtatanong", "tungkol", "tulong",
    "tulungan", "ba", "na", "pa", "ho",
}

BICOLANO_KEYWORDS = {
    "ano", "dai", "bako", "marhay", "salamat", "pwede", "gusto",
    "kakan", "magduman", "pumundo", "harani", "tabi", "saro", "duwa",
    "tulo", "idos", "kan", "nin", "an", "sinda", "kamo", "samo",
    "natan", "ngamin", "tig", "tigapon", "tigbaba", "tumulak", "tumukaw",
    "makan", "makanon", "siring", "siringon", "duman", "pundo", "tawo",
    "herak", "herak man", "herak daw", "puede", "pwedeng", "pwede tabi",
    "gustong", "gustong magduman", "gustong kakan", "maghigda",
    "tulogan", "paagihan", "paagihon", "lugar", "mga lugar", "mga pasyalan",
    "dagat", "baybayon", "salog", "bulod", "turog", "kadto", "kadtoan",
    "mabalik", "mabalik duman", "nagduduman", "nagtatao", "nagtatao tabi",
    "makulog", "makusog", "maray", "maray na", "maray na aga",
    "maray na hapon", "maray na banggi",
}

EN_KEYWORDS = {
    "what", "where", "how", "when", "which", "who", "why", "is", "are",
    "was", "were", "do", "does", "did", "can", "could", "would", "should",
    "will", "shall", "may", "might", "the", "a", "an", "this", "that",
    "these", "those", "my", "your", "his", "her", "its", "our", "their",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
    "us", "them", "recommend", "best", "good", "great", "nice", "cheap",
    "budget", "expensive", "near", "nearby", "close", "far", "distance",
    "place", "places", "spot", "spots", "beach", "beaches", "food",
    "restaurant", "hotel", "resort", "view", "viewpoint", "waterfall",
    "falls", "cave", "church", "heritage", "history", "surf", "surfing",
    "swim", "swimming", "dive", "hike", "hiking", "trek", "trekking",
    "itinerary", "plan", "trip", "travel", "visit", "go", "see", "find",
    "look", "search", "tell", "show", "give", "please", "thanks", "thank",
}


def detect_language(text: str) -> str:
    """Return 'tl', 'bicolano', or 'en' based on keyword overlap."""
    lowered = text.lower()
    # Split on whitespace and punctuation
    tokens = set(re.findall(r"[a-záéíóúñ]+", lowered))

    tl_score = len(tokens & TL_KEYWORDS)
    bicol_score = len(tokens & BICOLANO_KEYWORDS)
    en_score = len(tokens & EN_KEYWORDS)

    # Need at least one non-English keyword to declare non-English
    if tl_score == 0 and bicol_score == 0:
        return "en"

    # Tie-breaking: TL > Bicolano > EN (mixed queries usually TL-dominant)
    if tl_score >= bicol_score and tl_score > 0:
        return "tl"
    if bicol_score > tl_score and bicol_score > 0:
        return "bicolano"

    return "en"


# String maps for common UI-facing phrases
_GREETING = {
    "en": "Hi, I can help with Catanduanes places, nearby spots, budget picks, and simple itinerary ideas.",
    "tl": "Kamusta, makakatulong ako sa mga lugar sa Catanduanes, malapit na pasyalan, murang pagpipilian, at simpleng itinerary.",
    "bicolano": "Maray na aga, makakatulong ako sa mga lugar sa Catanduanes, harani na pasyalan, murang pagpipilian, asin simpleng itinerary.",
}

_FALLBACK = {
    "en": "Try asking for beaches, food, budget places, or a specific destination.",
    "tl": "Subukang magtanong tungkol sa beach, pagkain, murang lugar, o isang tukoy na destinasyon.",
    "bicolano": "Subukang magtanong manungod sa baybayon, kakan, murang lugar, o sarong tukoy na destinasyon.",
}

_PLACE_INFO_FOLLOWUP = {
    "en": "Ask for nearby food, another option, or add it.",
    "tl": "Magtanong ng malapit na pagkain, ibang opsyon, o idagdag ito.",
    "bicolano": "Magtanong nin harani na kakan, ibang opsyon, o idugang ini.",
}

_RECOMMENDATION_FOLLOWUP = {
    "en": "Tap 'Tell me more' for details, 'Another' for more picks, or 'Add to trip'.",
    "tl": "Pindutin 'Tell me more' para sa detalye, 'Another' para sa higit pang pagpipilian, o 'Add to trip'.",
    "bicolano": "Pinduton 'Tell me more' para sa detalye, 'Another' para sa dakul na pagpipilian, o 'Add to trip'.",
}

_ITINERARY_FOLLOWUP = {
    "en": "Ask to make it cheaper, add a stop, or replace a day.",
    "tl": "Magtanong na gawing mas mura, magdagdag ng hinto, o palitan ang isang araw.",
    "bicolano": "Magtanong na gawing mas mura, magdugang nin hinto, o palitan an sarong aldaw.",
}

_QUICK_LABELS = {
    "en": {
        "tell_me_more": "Tell me more",
        "nearby_food": "Nearby food",
        "add_to_trip": "Add to trip",
        "another": "Another",
        "make_cheaper": "Make cheaper",
        "show_route": "Show route",
    },
    "tl": {
        "tell_me_more": "Tell me more",
        "nearby_food": "Malapit na pagkain",
        "add_to_trip": "Idagdag sa trip",
        "another": "Iba pa",
        "make_cheaper": "Gawing mas mura",
        "show_route": "Ipakita ang ruta",
    },
    "bicolano": {
        "tell_me_more": "Tell me more",
        "nearby_food": "Harani na kakan",
        "add_to_trip": "Idugang sa trip",
        "another": "Iba pa",
        "make_cheaper": "Gawing mas mura",
        "show_route": "Ipakita an ruta",
    },
}


def localize(key: str, lang: str) -> str:
    """Fetch a localized string by key and language code."""
    maps: dict[str, dict[str, str]] = {
        "greeting": _GREETING,
        "fallback": _FALLBACK,
        "place_info_followup": _PLACE_INFO_FOLLOWUP,
        "recommendation_followup": _RECOMMENDATION_FOLLOWUP,
        "itinerary_followup": _ITINERARY_FOLLOWUP,
    }
    m = maps.get(key, {})
    return m.get(lang, m.get("en", ""))


def localize_quick_label(label_key: str, lang: str) -> str:
    """Fetch a localized quick-action label."""
    return _QUICK_LABELS.get(lang, _QUICK_LABELS["en"]).get(label_key, label_key)
