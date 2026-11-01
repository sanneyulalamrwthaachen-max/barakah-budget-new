/**
 * Barakah Budget - Google Sheets backend
 * -------------------------------------------------
 * This script stores your finance data in a Google Sheet in your own Drive.
 * It also fetches halal / Islamic finance news and gold & silver prices.
 *
 * SETUP (about 5 minutes, no developer account needed):
 *  1. Open  script.google.com  and click  New project.
 *  2. Delete everything in the editor. Paste this whole file.
 *  3. Change the SECRET line below to your own secret word.
 *     Make it long and hard to guess. You will type the same word
 *     into the app, in Settings > Google Sheet.
 *  4. Click the save icon. Name the project "Barakah Budget".
 *  5. Click  Deploy  >  New deployment.
 *  6. Click the gear icon next to "Select type" and choose  Web app.
 *  7. Set  Execute as: Me.
 *     Set  Who has access: Anyone.
 *  8. Click  Deploy. Google will ask for permission. Allow it.
 *     (If it says "Google hasn't verified this app", click Advanced,
 *      then "Go to Barakah Budget (unsafe)". It is your own script.)
 *  9. Copy the  Web app URL  that ends with  /exec
 * 10. Paste that URL and your secret word into the app,
 *     in Settings > Google Sheet.
 *
 * WHY "Anyone"?
 * The app runs in your phone browser. It can only talk to this script
 * if the script answers without a Google login screen. "Anyone" means
 * anyone who knows the long /exec address can send a request - so the
 * secret word below is what actually protects your data. Nobody can
 * read or change anything without it. Never share the URL or the word.
 * "Execute as: Me" keeps the spreadsheet inside your own Drive.
 *
 * The spreadsheet is created automatically the first time the app connects.
 * You will find it in your Drive, named "Barakah Budget Data".
 */

var SECRET = 'change-this-to-your-own-secret-word';

var BOOK_NAME = 'Barakah Budget Data';

var SHEETS = {
  Settings:     ['key', 'value'],
  FixedCosts:   ['id', 'name', 'amount', 'currency', 'category', 'active'],
  Budgets:      ['category', 'amount'],
  Transactions: ['id', 'date', 'type', 'category', 'amount', 'currency', 'rate', 'note', 'person', 'fixedId', 'debtId'],
  Debts:        ['id', 'lender', 'original', 'currency', 'note', 'createdAt'],
  Zakat:        ['key', 'value']
};

var DEFAULT_FEEDS = [
  { name: 'Salaam Gateway',       url: 'https://salaamgateway.com/feed' },
  { name: 'Salaam Gateway',       url: 'https://salaamgateway.com/feed/insights' },
  { name: 'Islamic Finance Guru', url: 'https://islamicfinanceguru.com/feed' },
  { name: 'Musaffa Academy',      url: 'https://academy.musaffa.com/feed' }
];

/* ------------------------------------------------------------------ */
/* Web entry points                                                    */
/* ------------------------------------------------------------------ */

function doGet(e) {
  return handle((e && e.parameter) ? e.parameter : {});
}

function doPost(e) {
  var p = {};
  try {
    p = JSON.parse(e.postData.contents);
  } catch (err) {
    p = (e && e.parameter) ? e.parameter : {};
  }
  return handle(p);
}

function handle(p) {
  var action = p.action || 'ping';

  if (!SECRET || SECRET === 'change-this-to-your-own-secret-word') {
    return json({ ok: false, error: 'This script still has the example secret word. Open the script and change the SECRET line.' });
  }
  if (String(p.secret || '') !== SECRET) {
    return json({ ok: false, error: 'Wrong secret word. It must match the SECRET line in your script exactly.' });
  }

  try {
    var out;
    if (action === 'ping') {
      out = { ok: true, version: '1.0', sheetUrl: getBook().getUrl() };
    } else if (action === 'load') {
      out = { ok: true, data: loadAll() };
    } else if (action === 'save') {
      out = { ok: true, saved: saveAll(p.data || {}) };
    } else if (action === 'news') {
      out = { ok: true, items: getNews(p.feeds) };
    } else if (action === 'metals') {
      out = { ok: true, metals: getMetals() };
    } else if (action === 'rates') {
      out = { ok: true, fx: getRates() };
    } else {
      out = { ok: false, error: 'Unknown action: ' + action };
    }
    return json(out);
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* Spreadsheet                                                         */
/* ------------------------------------------------------------------ */

function getBook() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('BOOK_ID');
  var ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(BOOK_NAME);
    props.setProperty('BOOK_ID', ss.getId());
  }
  ensureSheets(ss);
  return ss;
}

function ensureSheets(ss) {
  var names = Object.keys(SHEETS);
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.appendRow(SHEETS[name]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, SHEETS[name].length).setFontWeight('bold');
    }
  }
  var first = ss.getSheets()[0];
  if (first && first.getName() === 'Sheet1' && first.getLastRow() === 0) {
    ss.deleteSheet(first);
  }
}

function readSheet(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) return [];
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var head = values[0];
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var obj = {};
    var empty = true;
    for (var c = 0; c < head.length; c++) {
      var v = values[r][c];
      if (v !== '' && v !== null) empty = false;
      obj[String(head[c])] = v;
    }
    if (!empty) rows.push(obj);
  }
  return rows;
}

function writeSheet(ss, name, rows) {
  var sh = ss.getSheetByName(name);
  if (!sh) return 0;
  var head = SHEETS[name];
  sh.clear();
  sh.appendRow(head);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
  if (!rows || !rows.length) return 0;
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var line = [];
    for (var c = 0; c < head.length; c++) {
      var v = rows[i][head[c]];
      line.push(v === undefined || v === null ? '' : v);
    }
    out.push(line);
  }
  sh.getRange(2, 1, out.length, head.length).setValues(out);
  return out.length;
}

function pairsToObject(rows) {
  var o = {};
  for (var i = 0; i < rows.length; i++) {
    var k = String(rows[i].key || '');
    if (!k) continue;
    var v = rows[i].value;
    if (typeof v === 'string') {
      var t = v.trim();
      if (t.charAt(0) === '{' || t.charAt(0) === '[') {
        try { v = JSON.parse(t); } catch (e) { /* keep string */ }
      }
    }
    o[k] = v;
  }
  return o;
}

function objectToPairs(obj) {
  var rows = [];
  var keys = Object.keys(obj || {});
  for (var i = 0; i < keys.length; i++) {
    var v = obj[keys[i]];
    if (v !== null && typeof v === 'object') v = JSON.stringify(v);
    rows.push({ key: keys[i], value: v });
  }
  return rows;
}

function loadAll() {
  var ss = getBook();
  var budgetRows = readSheet(ss, 'Budgets');
  var budgets = {};
  for (var i = 0; i < budgetRows.length; i++) {
    budgets[String(budgetRows[i].category)] = Number(budgetRows[i].amount) || 0;
  }
  return {
    settings:   pairsToObject(readSheet(ss, 'Settings')),
    fixedCosts: readSheet(ss, 'FixedCosts'),
    budgets:    budgets,
    tx:         readSheet(ss, 'Transactions'),
    debts:      readSheet(ss, 'Debts'),
    zakat:      pairsToObject(readSheet(ss, 'Zakat')),
    sheetUrl:   ss.getUrl()
  };
}

function saveAll(data) {
  var ss = getBook();
  var budgetRows = [];
  var budgets = data.budgets || {};
  var keys = Object.keys(budgets);
  for (var i = 0; i < keys.length; i++) {
    budgetRows.push({ category: keys[i], amount: budgets[keys[i]] });
  }
  var counts = {
    Settings:     writeSheet(ss, 'Settings', objectToPairs(data.settings)),
    FixedCosts:   writeSheet(ss, 'FixedCosts', data.fixedCosts),
    Budgets:      writeSheet(ss, 'Budgets', budgetRows),
    Transactions: writeSheet(ss, 'Transactions', data.tx),
    Debts:        writeSheet(ss, 'Debts', data.debts),
    Zakat:        writeSheet(ss, 'Zakat', objectToPairs(data.zakat))
  };
  counts.sheetUrl = ss.getUrl();
  return counts;
}

/* ------------------------------------------------------------------ */
/* News                                                                */
/* ------------------------------------------------------------------ */

function getNews(feeds) {
  var list = (feeds && feeds.length) ? feeds : DEFAULT_FEEDS;
  var cache = CacheService.getScriptCache();
  var cacheKey = 'news_' + Utilities.base64EncodeWebSafe(JSON.stringify(list)).substring(0, 180);
  var hit = cache.get(cacheKey);
  if (hit) {
    try { return JSON.parse(hit); } catch (e) { /* fall through */ }
  }

  var items = [];
  for (var i = 0; i < list.length; i++) {
    var feed = list[i];
    var url = feed.url || feed;
    var name = feed.name || '';
    try {
      var res = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: true,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BarakahBudget/1.0)' }
      });
      if (res.getResponseCode() !== 200) continue;
      items = items.concat(parseFeed(res.getContentText(), name));
    } catch (err) {
      // Skip a feed that is down. The others still work.
    }
  }

  items.sort(function (a, b) {
    return (b.ts || 0) - (a.ts || 0);
  });
  items = items.slice(0, 40);

  try { cache.put(cacheKey, JSON.stringify(items), 3600); } catch (e) {}
  return items;
}

function parseFeed(xml, sourceName) {
  var items = [];
  var doc;
  try { doc = XmlService.parse(xml); } catch (e) { return items; }
  var root = doc.getRootElement();
  var atom = XmlService.getNamespace('http://www.w3.org/2005/Atom');

  var channel = root.getChild('channel');
  if (channel) {
    var feedTitle = sourceName || channel.getChildText('title') || 'News';
    var list = channel.getChildren('item');
    for (var i = 0; i < list.length && i < 15; i++) {
      var it = list[i];
      var dateStr = it.getChildText('pubDate') || '';
      items.push({
        title: clean(it.getChildText('title')),
        link: it.getChildText('link') || '',
        date: dateStr,
        ts: toTime(dateStr),
        summary: shorten(strip(it.getChildText('description') || '')),
        source: feedTitle
      });
    }
    return items;
  }

  var entries = root.getChildren('entry', atom);
  var atomTitle = sourceName || root.getChildText('title', atom) || 'News';
  for (var j = 0; j < entries.length && j < 15; j++) {
    var en = entries[j];
    var link = '';
    var linkEl = en.getChild('link', atom);
    if (linkEl && linkEl.getAttribute('href')) link = linkEl.getAttribute('href').getValue();
    var d = en.getChildText('published', atom) || en.getChildText('updated', atom) || '';
    items.push({
      title: clean(en.getChildText('title', atom)),
      link: link,
      date: d,
      ts: toTime(d),
      summary: shorten(strip(en.getChildText('summary', atom) || en.getChildText('content', atom) || '')),
      source: atomTitle
    });
  }
  return items;
}

function clean(s) {
  if (!s) return '';
  return String(s).replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

function strip(s) {
  return clean(s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function shorten(s) {
  if (s.length <= 220) return s;
  return s.substring(0, 217) + '...';
}

function toTime(s) {
  if (!s) return 0;
  var t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

/* ------------------------------------------------------------------ */
/* Gold and silver prices (for zakat nisab)                            */
/* ------------------------------------------------------------------ */

var TROY_OUNCE_IN_GRAM = 31.1034768;

function getMetals() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('metals_eur');
  if (hit) {
    try { return JSON.parse(hit); } catch (e) {}
  }
  var out = { goldPerGram: null, silverPerGram: null, source: '', fetchedAt: new Date().toISOString() };
  try {
    var res = UrlFetchApp.fetch('https://data-asg.goldprice.org/dbXRates/EUR', {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BarakahBudget/1.0)' }
    });
    if (res.getResponseCode() === 200) {
      var body = JSON.parse(res.getContentText());
      if (body && body.items && body.items.length) {
        var it = body.items[0];
        if (it.xauPrice) out.goldPerGram = round2(Number(it.xauPrice) / TROY_OUNCE_IN_GRAM);
        if (it.xagPrice) out.silverPerGram = round2(Number(it.xagPrice) / TROY_OUNCE_IN_GRAM);
        out.source = 'goldprice.org';
      }
    }
  } catch (err) {
    out.error = String(err && err.message ? err.message : err);
  }
  if (out.goldPerGram) {
    try { cache.put('metals_eur', JSON.stringify(out), 3600); } catch (e) {}
  }
  return out;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

/* ------------------------------------------------------------------ */
/* Exchange rates: how many USD / BDT make one EUR                     */
/* ------------------------------------------------------------------ */

function getRates() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('fx_eur');
  if (hit) {
    try { return JSON.parse(hit); } catch (e) {}
  }
  var out = { base: 'EUR', rates: {}, date: '', source: '' };

  try {
    var res = UrlFetchApp.fetch('https://open.er-api.com/v6/latest/EUR', {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BarakahBudget/1.0)' }
    });
    if (res.getResponseCode() === 200) {
      var b = JSON.parse(res.getContentText());
      if (b && b.rates && b.rates.USD) {
        out.rates.EUR = 1;
        out.rates.USD = round4(Number(b.rates.USD));
        if (b.rates.BDT) out.rates.BDT = round4(Number(b.rates.BDT));
        out.date = b.time_last_update_utc || '';
        out.source = 'open.er-api.com';
      }
    }
  } catch (err) {
    out.error = String(err && err.message ? err.message : err);
  }

  // Backup source. It has USD but no BDT, so BDT is left for you to type.
  if (!out.rates.USD) {
    try {
      var r2 = UrlFetchApp.fetch('https://api.frankfurter.app/latest?from=EUR&to=USD', {
        muteHttpExceptions: true
      });
      if (r2.getResponseCode() === 200) {
        var b2 = JSON.parse(r2.getContentText());
        if (b2 && b2.rates && b2.rates.USD) {
          out.rates.EUR = 1;
          out.rates.USD = round4(Number(b2.rates.USD));
          out.date = b2.date || '';
          out.source = 'frankfurter.app';
        }
      }
    } catch (err2) {
      out.error = String(err2 && err2.message ? err2.message : err2);
    }
  }

  if (out.rates.USD) {
    try { cache.put('fx_eur', JSON.stringify(out), 21600); } catch (e) {}
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Run this once from the editor if you want to create the sheet early */
/* ------------------------------------------------------------------ */

function setupNow() {
  var ss = getBook();
  Logger.log('Your spreadsheet: ' + ss.getUrl());
}
