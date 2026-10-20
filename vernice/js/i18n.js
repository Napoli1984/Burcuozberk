// Languages: Italian and Turkish. t('a.b.c', {n: 2}) returns the text for the current language
// ({n} is replaced); tv() returns the raw value (lists, objects). The choice is remembered.
import it from './lang/it.js';
import tr from './lang/tr.js';

const TABLES = { it, tr };
export const LANGS = ['it', 'tr'];
const KEY = 'bo-sv-lang';
const subs = [];

function detect() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && TABLES[q]) return q;
  } catch (e) { /* ignore */ }
  try {
    const s = localStorage.getItem(KEY);
    if (s && TABLES[s]) return s;
  } catch (e) { /* ignore */ }
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
  return /^tr\b/i.test(nav) ? 'tr' : 'it';
}

let lang = detect();

export function getLang() { return lang; }

export function setLang(l) {
  if (!TABLES[l] || l === lang) return;
  lang = l;
  try { localStorage.setItem(KEY, l); } catch (e) { /* ignore */ }
  for (const f of subs) f(l);
}

export function onLang(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; }

function lookup(tab, key) {
  let v = tab;
  for (const p of key.split('.')) {
    if (v == null) return undefined;
    v = v[p];
  }
  return v;
}

export function tv(key) {
  const v = lookup(TABLES[lang], key);
  return v === undefined ? lookup(TABLES.it, key) : v;
}

export function t(key, vars) {
  let v = tv(key);
  if (v === undefined) return key;
  if (typeof v !== 'string') return v;
  if (vars) v = v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  return v;
}

// A random entry of a list (speech bubbles).
export function pick(key) {
  const v = tv(key);
  return Array.isArray(v) && v.length ? v[Math.floor(Math.random() * v.length)] : '';
}
