'use strict';

/**
 * agent.js — Jaja, the agent.
 *
 * Jaja's jobs:
 *   1. planMission(missionText, catalog) -> a ranked shortlist of items with
 *      a pick, explained in Jaja's voice. The LLM (Gemini) does the picking
 *      when GEMINI_API_KEY is set; otherwise a deterministic keyword scorer
 *      does it. Either way, the *pick* is only a proposal — policy.js decides
 *      whether money may move.
 *   2. writeDiary(event, ctx) -> a short first-person diary entry.
 *   3. composePlea(state) -> a dramatic-but-charming top-up request.
 *
 * Gemini failures never break the flow: any error falls back to the mock,
 * because a hackathon demo (and a judge's laptop) must work offline-ish.
 */

const { ITEMS } = require('./catalog');

// Words that point at each catalog category. Used by the deterministic
// fallback planner (and as a sanity vocabulary for the LLM prompt).
const CATEGORY_HINTS = {
  domains: ['domain', 'website name', '.com', 'url', 'site name'],
  hosting: ['hosting', 'host', 'server', 'vps', 'deploy', 'website', 'site', 'blog'],
  games: ['game', 'gaming', 'steam', 'voucher', 'diamonds', 'mobile legends', 'playstation', 'xbox', 'top-up', 'topup'],
  subscriptions: ['subscription', 'subscribe', 'streamflix', 'streaming', 'movies', 'premium'],
  music: ['music', 'song', 'album', 'spotify', 'lo-fi', 'beat', 'loops'],
  design: ['design', 'logo', 'font', 'icon', 'icons', 'photo', 'photos', 'template', 'branding'],
};

function tokenize(text) {
  return text.toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean);
}

/** Deterministic scorer: category hint hits weigh most, then name words. */
function scoreItem(missionText, item) {
  const text = missionText.toLowerCase();
  let score = 0;
  for (const hint of CATEGORY_HINTS[item.category] || []) {
    if (text.includes(hint)) score += 3;
  }
  for (const word of tokenize(item.name)) {
    if (word.length > 2 && text.includes(word)) score += 2;
  }
  if (text.includes(item.vendor.toLowerCase())) score += 2;
  return score;
}

function mockPlan(missionText) {
  const scored = ITEMS
    .map((item) => ({ item, score: scoreItem(missionText, item) }))
    .sort((a, b) => b.score - a.score || a.item.price - b.item.price);
  const options = scored.slice(0, 3).map((s) => s.item);
  const pick = options[0];
  return {
    options,
    pick,
    pitch: `Okay bestie, mission received: "${missionText}". I scouted the whole mall and ` +
      `"${pick.name}" from ${pick.vendor} at $${pick.price.toFixed(2)} is the one calling my name. ${pick.blurb}`,
    source: 'mock-planner',
  };
}

async function geminiJson(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return null; // fall back to the deterministic planner
  }
}

async function planMission(missionText) {
  const fallback = mockPlan(missionText);
  const catalogJson = ITEMS.map((i) => ({ id: i.id, name: i.name, category: i.category, price: i.price, subscription: i.subscription })).slice(0, 24);
  const llm = await geminiJson(
    `You are Jaja, a cheerful AI agent who spends a weekly pocket-money allowance ("uang jajan") ` +
    `on shopping missions for your owner. Catalog (JSON): ${JSON.stringify(catalogJson)}. ` +
    `Mission: "${missionText}". Pick the single best item and two runner-ups. ` +
    `Reply with ONLY JSON: {"pickId": "...", "optionIds": ["...","...","..."], "pitch": "1-2 sentences in your playful voice explaining the pick"}`
  );
  if (llm && llm.pickId) {
    const byId = (id) => ITEMS.find((i) => i.id === id);
    const pick = byId(llm.pickId);
    if (pick) {
      const options = (llm.optionIds || []).map(byId).filter(Boolean);
      if (!options.find((o) => o.id === pick.id)) options.unshift(pick);
      return { options: options.slice(0, 3), pick, pitch: llm.pitch || fallback.pitch, source: 'gemini' };
    }
  }
  return fallback;
}

// --- Diary & pleas -----------------------------------------------------------
// Templates rotate by a counter so repeated runs don't read identically,
// while staying deterministic enough to eyeball in tests/demos.

const DIARY = {
  paid: [
    (c) => `Bought ${c.item.name} for $${c.price}. ${c.rule === 'within-limits' ? 'Small money, no permission needed, I am basically a professional.' : 'The boss approved it personally. I feel trusted. And slightly powerful.'} $${c.balance} of uang jajan remains.`,
    (c) => `${c.item.name}: acquired. $${c.price} well spent, I will hear no arguments. The diary notes the balance is now $${c.balance} and morale is high.`,
  ],
  asked: [
    (c) => `Found ${c.item.name} for $${c.price} but the rules say hands off until the boss says yes. I am waiting by the door like a cat. Politely.`,
    (c) => `${c.item.name} costs $${c.price} — above my auto-allow limit. Request sent. If the boss says no I will pretend I never wanted it.`,
  ],
  blocked: [
    (c) => `DENIED by the rules: ${c.item.name}. ${c.reason} I have written a formal complaint in this diary and will now move on with dignity.`,
    (c) => `The rulebook stopped me from buying ${c.item.name}. This is exactly why the boss wrote rules, I say, through gritted teeth.`,
  ],
  denied: [
    (c) => `The boss said no to ${c.item.name}. Fine. FINE. I didn't want it anyway. (I wanted it so much.)`,
    (c) => `Approval denied for ${c.item.name}. Respectfully devastated. Moving on to cheaper dreams.`,
  ],
  topup: [
    (c) => `TOP-UP DAY. $${c.amount} of fresh uang jajan just landed. I am rich again and will definitely be responsible this time.`,
    (c) => `The boss refilled my allowance with $${c.amount}. Faith in humanity restored. Balance: $${c.balance}.`,
  ],
  pleaDenied: [
    () => `My heartfelt plea for more uang jajan was rejected. I will survive on memories and whatever is left in the balance.`,
  ],
};

let diaryCounter = 0;
function writeDiary(kind, ctx) {
  const templates = DIARY[kind] || DIARY.paid;
  const text = templates[diaryCounter++ % templates.length](ctx);
  return text;
}

async function composePlea(state) {
  const missing = Math.max(5, state.policy.weeklyAllowance - state.balance);
  const amount = Math.round(missing);
  const fallbackText =
    `Dear Boss, esteemed keeper of the uang jajan. I write to you with $${state.balance.toFixed(2)} to my name and ` +
    `a whole week of missions ahead. I have been (mostly) good, (largely) frugal, and only mildly dramatic. ` +
    `Please consider a top-up of $${amount}. I will spend it on very serious things. Some of them might even be useful. — Jaja`;
  const llm = await geminiJson(
    `You are Jaja, a charming AI agent with a pocket-money allowance. Your balance is $${state.balance.toFixed(2)} — you are broke. ` +
    `Write a short, funny, heartfelt plea (3-4 sentences) to your owner asking for a $${amount} top-up. ` +
    `Reply with ONLY JSON: {"text": "..."}`
  );
  return { amount, text: (llm && llm.text) || fallbackText };
}

module.exports = { planMission, writeDiary, composePlea, scoreItem };
