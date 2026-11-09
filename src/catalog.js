'use strict';

/**
 * catalog.js — the little "mall" Jaja shops in.
 *
 * A curated in-app catalog of digital goods (no real web scraping — keeps the
 * demo honest, fast and reproducible for judges). Prices are USD. Items with
 * `subscription: true` auto-renew, which is exactly what the owner's default
 * policy bans — expect Jaja to get dramatically rejected over a few of these.
 */

const ITEMS = [
  // --- Domains -------------------------------------------------------------
  { id: 'dom-01', name: '.com domain — 1 year', category: 'domains', price: 12.99, vendor: 'NameNest', subscription: false, blurb: 'Classic .com for a portfolio or shop. Renews at the same price.' },
  { id: 'dom-02', name: '.ai domain — 1 year', category: 'domains', price: 54.99, vendor: 'NameNest', subscription: false, blurb: 'Trendy .ai domain. Fancy. Suspiciously fancy for this budget.' },
  { id: 'dom-03', name: '.id domain — 1 year', category: 'domains', price: 9.49, vendor: 'DomainLokal', subscription: false, blurb: 'Indonesian .id domain, cheap and cheerful.' },
  { id: 'dom-04', name: '.xyz domain — 1 year', category: 'domains', price: 2.99, vendor: 'NameNest', subscription: false, blurb: 'Costs less than a coffee. Slightly chaotic energy.' },
  { id: 'dom-05', name: '.store domain — 1 year', category: 'domains', price: 7.99, vendor: 'DomainLokal', subscription: false, blurb: 'For an online shop that does not exist yet.' },

  // --- Hosting -------------------------------------------------------------
  { id: 'hos-01', name: 'CloudNest Hosting — Starter, 1 year', category: 'hosting', price: 29.00, vendor: 'CloudNest', subscription: false, blurb: 'Solid shared hosting, free SSL, one website. The sensible shoes of hosting.' },
  { id: 'hos-02', name: 'BudgetHost — 1 year', category: 'hosting', price: 14.50, vendor: 'BudgetHost', subscription: false, blurb: 'Cheapest legit hosting that still answers support tickets.' },
  { id: 'hos-03', name: 'RocketVPS — 1 month', category: 'hosting', price: 24.00, vendor: 'RocketVPS', subscription: true, blurb: 'Fast VPS, billed monthly, auto-renews. Jaja is drooling. The rules are not.' },
  { id: 'hos-04', name: 'StaticSite Pro — deploy credits', category: 'hosting', price: 5.00, vendor: 'StaticSite', subscription: false, blurb: 'One-off credits to deploy static sites. No renewals, no drama.' },
  { id: 'hos-05', name: 'CloudNest Hosting — Business, 1 year', category: 'hosting', price: 59.00, vendor: 'CloudNest', subscription: false, blurb: 'Unlimited sites, priority support, and a price tag that says no.' },

  // --- Game vouchers --------------------------------------------------------
  { id: 'gam-01', name: 'Steam Wallet voucher — $10', category: 'games', price: 10.00, vendor: 'GameTopup', subscription: false, blurb: 'Ten dollars of pure weekend potential.' },
  { id: 'gam-02', name: 'Steam Wallet voucher — $20', category: 'games', price: 20.00, vendor: 'GameTopup', subscription: false, blurb: 'The big one. The sale season is calling.' },
  { id: 'gam-03', name: 'Mobile Legends — 86 diamonds', category: 'games', price: 2.19, vendor: 'GameTopup', subscription: false, blurb: 'Tiny top-up, huge confidence boost.' },
  { id: 'gam-04', name: 'PlayStation Store gift card — $25', category: 'games', price: 25.00, vendor: 'GameTopup', subscription: false, blurb: 'For the wishlist game that finally went on sale.' },
  { id: 'gam-05', name: 'Xbox Game Pass Ultimate — 1 month', category: 'games', price: 16.99, vendor: 'GameTopup', subscription: true, blurb: 'Hundreds of games, auto-renews monthly. A trap wearing a party hat.' },

  // --- Subscriptions ---------------------------------------------------------
  { id: 'sub-01', name: 'StreamFlix Premium — 1 month', category: 'subscriptions', price: 13.99, vendor: 'StreamFlix', subscription: true, blurb: 'Movies in 4K. Renews forever unless someone brave cancels.' },
  { id: 'sub-02', name: 'NoteCloud Pro — 1 month', category: 'subscriptions', price: 8.99, vendor: 'NoteCloud', subscription: true, blurb: 'Syncs your notes everywhere. Also syncs a charge every month.' },
  { id: 'sub-03', name: 'VibeTube Premium — 1 month', category: 'subscriptions', price: 11.99, vendor: 'VibeTube', subscription: true, blurb: 'No ads, background play, monthly auto-renew included at no extra trust.' },

  // --- Music ------------------------------------------------------------------
  { id: 'mus-01', name: 'LaguKita album download — "Senja di Kota"', category: 'music', price: 6.49, vendor: 'LaguKita', subscription: false, blurb: 'Own the album forever. Revolutionary concept.' },
  { id: 'mus-02', name: 'Beat pack — lo-fi loops vol. 3', category: 'music', price: 11.00, vendor: 'BeatBazaar', subscription: false, blurb: 'Royalty-free loops for videos and streams.' },
  { id: 'mus-03', name: 'StreamTunes Premium — 1 month', category: 'music', price: 9.99, vendor: 'StreamTunes', subscription: true, blurb: 'All the music, none of the ownership, auto-renews monthly.' },

  // --- Food & drinks (the original jajan) --------------------------------------
  { id: 'fod-01', name: 'Nasi Padang lunch voucher', category: 'food', price: 6.50, vendor: 'DapurOnline', subscription: false, blurb: 'Rendang, sayur, sambal ijo. Delivered hot, gone in ten minutes.' },
  { id: 'fod-02', name: 'Kopi susu literan voucher', category: 'food', price: 7.25, vendor: 'KopiKala', subscription: false, blurb: 'One litre of iced milk coffee. Productivity in a bottle.' },
  { id: 'fod-03', name: 'Martabak manis voucher', category: 'food', price: 5.75, vendor: 'JajanMart', subscription: false, blurb: 'Thick sweet pancake, chocolate and cheese. The classic jajan.' },
  { id: 'fod-04', name: 'Bubble tea voucher — 2 cups', category: 'food', price: 4.50, vendor: 'TehSegar', subscription: false, blurb: 'Brown sugar boba for you and your favorite human.' },
  { id: 'fod-05', name: 'Weekly groceries basket voucher', category: 'food', price: 18.50, vendor: 'WarungKu', subscription: false, blurb: 'Rice, eggs, veggies and sambal essentials from the neighborhood warung, delivered.' },

  // --- Transport ---------------------------------------------------------------
  { id: 'tra-01', name: 'Ride-hail voucher — 5 trips', category: 'transport', price: 5.50, vendor: 'AngkutApp', subscription: false, blurb: 'Ojek and car rides across town. Rain-proof plans.' },
  { id: 'tra-02', name: 'Fuel voucher — full tank x2', category: 'transport', price: 8.00, vendor: 'BensinKu', subscription: false, blurb: 'Two full tanks for the motorbike. Freedom smells like petrol.' },
  { id: 'tra-03', name: 'E-toll balance top-up', category: 'transport', price: 7.00, vendor: 'JalanKu', subscription: false, blurb: 'So the toll gate never judges you again.' },

  // --- Bills & top-ups -----------------------------------------------------------
  { id: 'bil-01', name: 'Token listrik voucher — 50 kWh', category: 'bills', price: 9.25, vendor: 'ListrikKu', subscription: false, blurb: 'PLN prepaid electricity token. Silences the dying-meter beep.' },
  { id: 'bil-02', name: 'Pulsa + 25 GB data package', category: 'bills', price: 6.75, vendor: 'PulsaKu', subscription: false, blurb: 'Phone credit and a month of scrolling insurance.' },
  { id: 'bil-03', name: 'Home internet bill voucher', category: 'bills', price: 19.00, vendor: 'NetRumah', subscription: false, blurb: 'One month of home internet, paid before the reminder SMS gets dramatic.' },

  // --- Health ----------------------------------------------------------------------
  { id: 'hea-01', name: 'Pharmacy voucher', category: 'health', price: 12.00, vendor: 'SehatKu', subscription: false, blurb: 'For whatever the season is handing out. Get well soon.' },
  { id: 'hea-02', name: 'Vitamin & jamu wellness pack', category: 'health', price: 5.25, vendor: 'SehatKu', subscription: false, blurb: 'Vitamins plus traditional jamu. Grandma approved.' },
  { id: 'hea-03', name: 'Gym day pass', category: 'health', price: 4.75, vendor: 'KuatKu', subscription: false, blurb: 'One day of good intentions, fully equipped.' },

  // --- Home & daily ------------------------------------------------------------------
  { id: 'hom-01', name: 'Laundry kiloan voucher — 5 kg', category: 'home', price: 3.80, vendor: 'CuciKilat', subscription: false, blurb: 'Wash, iron, fold. Smells like a fresh start.' },
  { id: 'hom-02', name: 'Home cleaning voucher — 2 hours', category: 'home', price: 13.50, vendor: 'BersihKu', subscription: false, blurb: 'Two hours of someone else making it spotless.' },
  { id: 'hom-03', name: 'Galon water refill voucher x4', category: 'home', price: 3.20, vendor: 'SegarKu', subscription: false, blurb: 'Four drinking-water refills. Hydration is a lifestyle.' },

  // --- Design assets ------------------------------------------------------------
  { id: 'des-01', name: 'Icon pack — 2,000 hand-drawn icons', category: 'design', price: 18.00, vendor: 'PixelPasar', subscription: false, blurb: 'Every icon you will ever need, including three kinds of rocket.' },
  { id: 'des-02', name: 'Font bundle — "Kala Senja" serif family', category: 'design', price: 22.00, vendor: 'PixelPasar', subscription: false, blurb: 'A gorgeous serif with Indonesian diacritics done right.' },
  { id: 'des-03', name: 'Logo template kit — warung edition', category: 'design', price: 4.99, vendor: 'PixelPasar', subscription: false, blurb: 'Forty logo templates for food stalls and small shops.' },
  { id: 'des-04', name: 'Stock photo bundle — 100 Jakarta street shots', category: 'design', price: 15.00, vendor: 'PixelPasar', subscription: false, blurb: 'Real street photography, properly licensed.' },
];

function byId(id) {
  return ITEMS.find((i) => i.id === id) || null;
}

module.exports = { ITEMS, byId };
