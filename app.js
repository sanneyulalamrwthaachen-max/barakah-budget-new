"use strict";

/* ---------------- constants ---------------- */
var LS_KEY = "barakah_budget_v1";
var THEME_KEY = "barakah_theme";

var EXPENSE_CATS = ["Groceries","Eating out","Rent / dorm","Health insurance","Dental insurance",
  "Medicine & pharmacy","Internet","Mobile","Cloud & software","Education","Hobby & gadgets",
  "Islamic essentials","Transport","Family support","Donation & sadaqah","Help to relatives",
  "Debt repayment","Semester fee","Other"];
var INCOME_CATS = ["Working student job","Scholarship","Loan repaid to me","Gift received","Other income"];
var SADAQAH_CATS = ["Donation & sadaqah","Help to relatives"];
var SEND_CATS = ["Family support","Help to relatives"];

var DEBT_TYPES = ["Blocked account (Sperrkonto)","Family","Friend","Bank loan","Credit card",
  "University or tuition","Employer advance","Shop or instalment plan","Other"];

var CURRENCIES = [
  {code:"EUR", name:"Euro",              symbol:"\u20ac", locale:"de-DE"},
  {code:"USD", name:"US dollar",         symbol:"$",       locale:"en-US"},
  {code:"BDT", name:"Bangladeshi taka",  symbol:"\u09f3", locale:"en-BD"}
];

var NISAB_GOLD_G = 85;
var NISAB_SILVER_G = 595;
var HAWL_DAYS = 354;

var DEFAULT_FEEDS = [
  {name:"Salaam Gateway", url:"https://salaamgateway.com/feed"},
  {name:"Salaam Gateway", url:"https://salaamgateway.com/feed/insights"},
  {name:"Islamic Finance Guru", url:"https://islamicfinanceguru.com/feed"},
  {name:"Musaffa Academy", url:"https://academy.musaffa.com/feed"}
];

var LEARN = [
  {t:"Riba (interest)", b:"Riba means a fixed extra amount charged for lending money. Islam forbids paying it and taking it. In Germany this matters for credit cards, overdraft on your giro account (Dispo), student loans and savings interest. Many scholars say interest you cannot avoid receiving should be given away to the poor, without expecting reward for it."},
  {t:"Gharar and maysir", b:"Gharar is deep uncertainty in a contract. Maysir is gambling. Both are avoided. This is why conventional insurance and most derivatives are questioned, and why takaful was created as a shared-risk alternative."},
  {t:"Zakat and sadaqah are not the same", b:"Zakat is obligatory. It is 2.5% of your qualifying wealth once a year, for eight named groups of people. Sadaqah is voluntary and can be any amount, any time, to anyone in need. Helping a relative in need is sadaqah, and giving to a poor relative who is not your dependant can also count as zakat."},
  {t:"Nisab and hawl", b:"Nisab is the minimum wealth before zakat is due: the value of 85 g of gold or 595 g of silver. Hawl is one lunar year (about 354 days). If your wealth stays at or above nisab for a full hawl, zakat becomes due. Using the silver nisab gives a lower limit, so more people pay."},
  {t:"Screening a share or an ETF", b:"Two checks are normal. First the business: no alcohol, pork, gambling, conventional banking, adult content or weapons. Second the balance sheet: most screens reject a company if interest-bearing debt is above about a third of its market value, or if income from forbidden sources is above about 5%. If some income is not clean, that part is given away (purification)."},
  {t:"Sukuk", b:"Often called an Islamic bond, but it is not a loan. You buy a share of a real asset or project and receive part of what it earns. The return comes from the asset, not from interest on money."},
  {t:"Takaful", b:"Cooperative insurance. Members pay into a shared fund and the fund pays whoever has a loss. Any surplus belongs to the members. In Germany health insurance is required by law, so most scholars treat it as a necessity even where no takaful option exists."},
  {t:"Common contracts", b:"Murabaha: the bank buys the item and sells it to you for a higher agreed price, paid in instalments. Ijara: a lease, like rent to own. Mudarabah: one side gives money, the other gives work, and they share the profit. Musharakah: both sides put in money and share profit and loss."},
  {t:"A simple plan for a student", b:"Keep an emergency fund first, in a plain current account. Pay down debt early, because debt removes your peace of mind. Only invest money you will not need for several years. Check that any fund is screened by a recognised sharia board, and look at the yearly cost before you buy."}
];

/* ---------------- state ---------------- */
function uid(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4); }
function todayISO(){ var d=new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function pad(n){ return n<10 ? "0"+n : ""+n; }

function freshData(){
  return {
    version: 2,
    settings: {
      monthlyIncome: 0,
      donationGoal: 70,
      semesterFee: 400,
      semesterMonths: 6,
      goldPerGram: 120,
      silverPerGram: 1.65,
      nisabBase: "silver",
      mainCurrency: "EUR",
      rates: {EUR:1, USD:1.1164, BDT:138.8},
      ratesUpdated: "",
      freezeRates: false,
      scriptUrl: "",
      secret: "",
      autoSync: false,
      sheetUrl: "",
      feeds: DEFAULT_FEEDS
    },
    fixedCosts: [
      {id:uid(), name:"Dorm rent",            amount:0,  currency:"EUR", category:"Rent / dorm",      active:true},
      {id:uid(), name:"Health insurance",     amount:0,  currency:"EUR", category:"Health insurance", active:true},
      {id:uid(), name:"Dental insurance",     amount:0,  currency:"EUR", category:"Dental insurance", active:true},
      {id:uid(), name:"Dorm internet",        amount:0,  currency:"EUR", category:"Internet",         active:true},
      {id:uid(), name:"Mobile internet",      amount:10, currency:"EUR", category:"Mobile",           active:true},
      {id:uid(), name:"Cloud subscription",   amount:22, currency:"EUR", category:"Cloud & software", active:true},
      {id:uid(), name:"Donation",             amount:70, currency:"EUR", category:"Donation & sadaqah", active:true},
      {id:uid(), name:"Semester fee saving",  amount:67, currency:"EUR", category:"Semester fee",     active:true}
    ],
    budgets: {"Groceries":130,"Eating out":20,"Hobby & gadgets":0,"Education":0,"Transport":0},
    alerts: {
      "Groceries":   {warn:90, stop:117},
      "Eating out":  {warn:15, stop:18}
    },
    tx: [],
    debts: [],
    zakat: {cash:0,bank:0,gold:0,silver:0,lent:0,invest:0,debts:0,other:0,otherCur:"BDT",hawlStart:""}
  };
}

function load(){
  try{
    var raw = localStorage.getItem(LS_KEY);
    if(raw){
      var d = JSON.parse(raw);
      return mergeDefaults(d);
    }
  }catch(e){}
  return freshData();
}
function mergeDefaults(d){
  var f = freshData();
  if(!d || typeof d !== "object") return f;
  d.settings = Object.assign({}, f.settings, d.settings || {});
  d.settings.rates = Object.assign({}, f.settings.rates, d.settings.rates || {});
  if(CURRENCIES.filter(function(c){ return c.code === d.settings.mainCurrency; }).length === 0){
    d.settings.mainCurrency = "EUR";
  }
  if(!Array.isArray(d.settings.feeds) || !d.settings.feeds.length) d.settings.feeds = DEFAULT_FEEDS;
  if(!Array.isArray(d.fixedCosts)) d.fixedCosts = f.fixedCosts;
  if(!Array.isArray(d.tx)) d.tx = [];
  if(!Array.isArray(d.debts)) d.debts = [];
  d.budgets = Object.assign({}, f.budgets, d.budgets || {});
  d.alerts = Object.assign({}, f.alerts, d.alerts || {});
  /* One-off: people who installed before limits existed get the two
     the app now ships with, but only where they had set nothing. */
  if(num(d.version) < 2){
    if(num(d.budgets["Eating out"]) <= 0) d.budgets["Eating out"] = 20;
    if(num(d.budgets["Groceries"]) <= 0) d.budgets["Groceries"] = 130;
    d.version = 2;
  }
  d.zakat = Object.assign({}, f.zakat, d.zakat || {});
  return d;
}
function persist(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); }catch(e){}
  if(S.settings.autoSync && S.settings.scriptUrl) queueSync();
}

var S = load();
var curMonth = todayISO().slice(0,7);
var activeScreen = "home";
var txType = "expense";
var editingDebt = "";
var editingTx = "";
var debtDir = "iowe";
var newsCache = null;

/* ---------------- helpers ---------------- */
var fmtCache = {};
function curInfo(code){
  var hit = CURRENCIES.filter(function(c){ return c.code === code; })[0];
  return hit || CURRENCIES[0];
}
function fmtFor(code){
  if(!fmtCache[code]){
    var c = curInfo(code);
    try{ fmtCache[code] = new Intl.NumberFormat(c.locale,{style:"currency",currency:c.code,currencyDisplay:"narrowSymbol"}); }
    catch(e){
      try{ fmtCache[code] = new Intl.NumberFormat(c.locale,{style:"currency",currency:c.code}); }
      catch(e2){
        try{ fmtCache[code] = new Intl.NumberFormat("en-US",{style:"currency",currency:c.code}); }
        catch(e3){ fmtCache[code] = null; }
      }
    }
  }
  return fmtCache[code];
}
function money(n, code){
  code = code || (S && S.settings ? S.settings.mainCurrency : "EUR") || "EUR";
  var v = isFinite(n) ? n : 0;
  var f = fmtFor(code);
  if(f) return f.format(v);
  return curInfo(code).symbol + v.toFixed(2);
}
function round2(n){ return Math.round(n*100)/100; }

/* How many units of `code` make one euro. */
function rateOf(code){
  var r = num(S.settings.rates[code]);
  return r > 0 ? r : 1;
}
/* Convert an amount in `code` into the main currency. */
function toMain(amount, code, frozen){
  code = code || "EUR";
  var main = S.settings.mainCurrency || "EUR";
  var perEur = (S.settings.freezeRates && num(frozen) > 0) ? num(frozen) : rateOf(code);
  if(perEur <= 0) perEur = 1;
  return (num(amount) / perEur) * rateOf(main);
}
function txMain(t){ return toMain(num(t.amount), t.currency || "EUR", t.rate); }
/* Shown next to a record when it was not entered in the main currency. */
function origNote(t){
  var cur = t.currency || "EUR";
  if(cur === (S.settings.mainCurrency || "EUR")) return "";
  return money(num(t.amount), cur);
}
function num(v){ var n = parseFloat(v); return isFinite(n) ? n : 0; }
function esc(s){
  return String(s==null?"":s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function $(id){ return document.getElementById(id); }
function monthLabel(key){
  var p = key.split("-");
  var d = new Date(Number(p[0]), Number(p[1])-1, 1);
  return d.toLocaleDateString("en-GB",{month:"long", year:"numeric"});
}
function shiftMonth(key, delta){
  var p = key.split("-");
  var d = new Date(Number(p[0]), Number(p[1])-1+delta, 1);
  return d.getFullYear()+"-"+pad(d.getMonth()+1);
}
function monthTx(key){
  return S.tx.filter(function(t){ return String(t.date||"").slice(0,7) === key; });
}
function sumTx(list, type){
  return list.reduce(function(a,t){
    if(type && t.type !== type) return a;
    return a + txMain(t);
  },0);
}
function toast(msg){
  var old = document.querySelector(".toast");
  if(old) old.remove();
  var el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function(){ if(el.parentNode) el.remove(); }, 2600);
}
function typeOptions(current){
  return DEBT_TYPES.map(function(c){
    return '<option value="'+esc(c)+'"'+(c===current?" selected":"")+'>'+esc(c)+'</option>';
  }).join("");
}
function curOptions(current){
  return CURRENCIES.map(function(c){
    return '<option value="'+c.code+'"'+(c.code===current?" selected":"")+'>'+c.code+'</option>';
  }).join("");
}
function fillCurSelect(sel, current, longNames){
  sel.innerHTML = CURRENCIES.map(function(c){
    var label = longNames ? (c.code + " \u2014 " + c.name) : c.code;
    return '<option value="'+c.code+'"'+(c.code===current?" selected":"")+'>'+label+'</option>';
  }).join("");
}
function fillSelect(sel, items, current){
  sel.innerHTML = items.map(function(c){
    return '<option value="'+esc(c)+'"'+(c===current?" selected":"")+'>'+esc(c)+'</option>';
  }).join("");
}

/* ---------------- money maths ---------------- */
function fixedActive(){ return S.fixedCosts.filter(function(f){ return f.active !== false && f.active !== "FALSE"; }); }
function fixedPlannedTotal(){ return fixedActive().reduce(function(a,f){ return a + toMain(num(f.amount), f.currency || "EUR"); },0); }
function isFixedPaid(fc, key){
  return S.tx.some(function(t){ return t.fixedId === fc.id && String(t.date||"").slice(0,7) === key; });
}
/* Money a borrower returns is cash in, but it is not earnings.
   It must not stand in for your salary when working out the plan. */
function loanRepaidIn(key){
  return monthTx(key).reduce(function(a,t){
    return (t.type === "income" && t.category === "Loan repaid to me") ? a + txMain(t) : a;
  },0);
}
function monthEarned(key){ return sumTx(monthTx(key), "income") - loanRepaidIn(key); }
function monthIncome(key){
  var earned = monthEarned(key);
  return (earned > 0 ? earned : num(S.settings.monthlyIncome)) + loanRepaidIn(key);
}
function monthIncomeIsPlan(key){ return monthEarned(key) <= 0; }
function monthSpent(key){ return sumTx(monthTx(key), "expense"); }
function variableSpent(key){
  return monthTx(key).reduce(function(a,t){
    if(t.type !== "expense") return a;
    if(t.fixedId) return a;
    return a + txMain(t);
  },0);
}
function catSpent(key, cat){
  return monthTx(key).reduce(function(a,t){
    return (t.type === "expense" && t.category === cat) ? a + txMain(t) : a;
  },0);
}
/* Where a category stands against its limit this month.
   warn  -> the YOLO nudge
   stop  -> red, you are nearly out
   over  -> past the limit */
function budgetState(cat, key){
  var limit = num(S.budgets[cat]);
  var spent = catSpent(key, cat);
  var a = S.alerts[cat] || {};
  var warn = num(a.warn);
  var stop = num(a.stop);
  if(warn <= 0) warn = limit * 0.75;
  if(stop <= 0) stop = limit * 0.90;

  var level = "ok";
  if(limit > 0){
    if(spent > limit) level = "over";
    else if(stop > 0 && spent >= stop) level = "stop";
    else if(warn > 0 && spent >= warn) level = "yolo";
  }
  return {
    cat: cat, limit: limit, spent: spent, warn: warn, stop: stop,
    level: level, left: limit - spent,
    pct: limit > 0 ? Math.min(100, spent / limit * 100) : 0
  };
}

function watchedCategories(){
  return Object.keys(S.budgets).filter(function(c){ return num(S.budgets[c]) > 0; });
}

function budgetBadge(st){
  if(st.level === "over") return '<span class="pill stop">\u26a0 OVER</span>';
  if(st.level === "stop") return '<span class="pill stop">\u26a0 STOP</span>';
  if(st.level === "yolo") return '<span class="pill yolo">YOLO</span>';
  return "";
}

function budgetFoot(st){
  if(st.level === "over") return {cls:"bad",  text: money(Math.abs(st.left)) + " over your limit"};
  if(st.level === "stop") return {cls:"bad",  text: "Only " + money(st.left) + " left \u2014 stop here"};
  if(st.level === "yolo") return {cls:"warn", text: money(st.left) + " left \u2014 slow down"};
  return {cls:"", text: money(st.left) + " left"};
}

function sadaqahPaid(key){
  return SADAQAH_CATS.reduce(function(a,c){ return a + catSpent(key,c); },0);
}
function isOwedToMe(d){ return d.direction === "theyowe"; }
function debtsByDir(dir){
  return S.debts.filter(function(d){ return (d.direction || "iowe") === dir; });
}
function debtRemaining(d){
  var cur = d.currency || "EUR";
  var original = toMain(num(d.original), cur);
  var paid = S.tx.reduce(function(a,t){ return t.debtId === d.id ? a + txMain(t) : a; },0);
  return { paid: paid, left: Math.max(0, original - paid), original: original, currency: cur, raw: num(d.original) };
}
function daysLeftInMonth(key){
  var now = new Date();
  var thisKey = todayISO().slice(0,7);
  var p = key.split("-");
  var last = new Date(Number(p[0]), Number(p[1]), 0).getDate();
  if(key !== thisKey) return last;
  return Math.max(1, last - now.getDate() + 1);
}

/* ---------------- rendering ---------------- */
function paintCurrencyLabels(){
  var sym = curInfo(S.settings.mainCurrency || "EUR").symbol;
  Array.prototype.forEach.call(document.querySelectorAll(".curlbl"), function(el){
    el.textContent = sym;
  });
}

function render(){
  paintCurrencyLabels();
  $("mLabel").textContent = monthLabel(curMonth);
  $("monthbar").hidden = (activeScreen === "zakat" || activeScreen === "news" || activeScreen === "settings");
  if(activeScreen === "home"){ renderAlerts(); renderHome(); }
  if(activeScreen === "spend") renderSpend();
  if(activeScreen === "debt") renderDebt();
  if(activeScreen === "zakat") renderZakat();
  if(activeScreen === "settings") renderSettings();
}

function renderAlerts(){
  var hits = watchedCategories().map(function(c){ return budgetState(c, curMonth); })
    .filter(function(st){ return st.level !== "ok"; })
    .sort(function(a,b){
      var rank = {over:0, stop:1, yolo:2};
      return rank[a.level] - rank[b.level];
    });

  if(!hits.length){ $("hAlerts").innerHTML = ""; return; }

  var worst = hits[0].level === "yolo" ? "" : " stop";
  $("hAlerts").innerHTML =
    '<div class="card alertcard'+worst+'">'+
      '<div class="card-head"><h2>Watch your limits</h2></div>'+
      hits.map(function(st){
        var f = budgetFoot(st);
        return '<div class="alertline">'+
          '<div class="grow"><div class="name">'+esc(st.cat)+'</div>'+
          '<div class="budgetfoot '+f.cls+'">'+esc(f.text)+'</div></div>'+
          '<div class="num">'+money(st.spent)+' / '+money(st.limit)+'</div>'+
          budgetBadge(st)+
        '</div>';
      }).join("")+
    '</div>';
}

function renderHome(){
  var inc = monthIncome(curMonth);
  var spent = monthSpent(curMonth);
  var left = inc - spent;
  $("hLeft").textContent = money(left);
  $("hLeftSub").textContent = monthIncomeIsPlan(curMonth)
    ? "Based on your income plan. Add your real pay under Spending."
    : "Income this month minus everything you spent.";
  $("hIncome").textContent = money(inc);
  $("hSpent").textContent = money(spent);

  var available = inc - fixedPlannedTotal() - variableSpent(curMonth);
  var perDay = available / daysLeftInMonth(curMonth);
  $("hPerDay").textContent = money(perDay);
  $("hPerDay").parentNode.className = "tile " + (perDay < 0 ? "bad" : "good");

  // fixed bills
  var paidCount = 0;
  var fa = fixedActive();
  var html = fa.map(function(f){
    var paid = isFixedPaid(f, curMonth);
    if(paid) paidCount++;
    return '<div class="row">'+
      '<div class="grow"><div class="name">'+esc(f.name)+'</div>'+
      '<div class="meta">'+esc(f.category + ((f.currency||"EUR") !== (S.settings.mainCurrency||"EUR")
          ? " · " + money(num(f.amount), f.currency||"EUR") : ""))+'</div></div>'+
      '<div class="num">'+money(toMain(num(f.amount), f.currency||"EUR"))+'</div>'+
      '<button class="btn sm '+(paid?"sec":"")+'" data-fixed="'+esc(f.id)+'">'+(paid?"Paid":"Mark paid")+'</button>'+
    '</div>';
  }).join("");
  $("hFixed").innerHTML = html || '<div class="empty">No bills yet. Add them in Settings.</div>';
  $("hFixedRight").textContent = paidCount + " of " + fa.length + " paid · " + money(fixedPlannedTotal());

  // donation
  var goal = num(S.settings.donationGoal);
  var given = sadaqahPaid(curMonth);
  var pct = goal > 0 ? Math.min(100, given/goal*100) : (given>0?100:0);
  $("hDonBar").style.width = pct + "%";
  $("hDonBar").className = given >= goal ? "good" : "";
  $("hDonRight").textContent = money(given) + " of " + money(goal);
  $("hDonNote").textContent = given >= goal
    ? "Your monthly amount is complete. Anything more is extra, inshallah."
    : money(Math.max(0, goal - given)) + " left to reach your monthly amount. Help given to relatives counts here too.";

  // budgets
  var bk = watchedCategories();
  $("hBudgets").innerHTML = bk.length ? bk.map(function(c){
    var st = budgetState(c, curMonth);
    var f = budgetFoot(st);
    var cls = (st.level === "over" || st.level === "stop") ? "bad"
            : (st.level === "yolo" ? "warn" : "good");
    return '<div style="display:flex;flex-direction:column;gap:5px">'+
      '<div class="row"><div class="grow name">'+esc(c)+'</div>'+
      budgetBadge(st)+
      '<div class="num">'+money(st.spent)+' / '+money(st.limit)+'</div></div>'+
      '<div class="bar"><i class="'+cls+'" style="width:'+st.pct+'%"></i></div>'+
      '<div class="budgetfoot '+f.cls+'">'+esc(f.text)+'</div></div>';
  }).join("") : '<div class="empty">No limits set yet. Add them in Settings.</div>';

  // breakdown
  var byCat = {};
  monthTx(curMonth).forEach(function(t){
    if(t.type !== "expense") return;
    byCat[t.category] = (byCat[t.category]||0) + num(t.amount);
  });
  var rows = Object.keys(byCat).sort(function(a,b){ return byCat[b]-byCat[a]; });
  var total = rows.reduce(function(a,c){ return a + byCat[c]; },0);
  $("hBreakdown").innerHTML = rows.length ? rows.map(function(c){
    var p = total>0 ? byCat[c]/total*100 : 0;
    return '<div style="display:flex;flex-direction:column;gap:5px">'+
      '<div class="row"><div class="grow name">'+esc(c)+'</div>'+
      '<div class="num">'+money(byCat[c])+'</div>'+
      '<div class="pill">'+p.toFixed(0)+'%</div></div>'+
      '<div class="bar"><i style="width:'+p+'%"></i></div></div>';
  }).join("") : '<div class="empty">Nothing recorded for this month yet.</div>';
}

/* One record, with a pencil that opens it for editing in place. */
function txRow(t){
  var sign = t.type === "income" ? "+" : "−";
  var color = t.type === "income" ? "var(--good)" : "var(--fg)";
  var orig = origNote(t);
  var meta = [t.category, t.person, t.note, orig ? "entered as "+orig : ""].filter(Boolean).join(" · ");
  var locked = !!(t.fixedId || t.debtId);
  return '<div style="display:flex;flex-direction:column;gap:8px">'+
    '<div class="row">'+
      '<div class="grow"><div class="name">'+esc(t.date)+'</div>'+
      '<div class="meta">'+esc(meta)+'</div></div>'+
      '<div class="num" style="color:'+color+'">'+sign+' '+money(txMain(t))+'</div>'+
      '<button class="iconbtn" data-topen="'+esc(t.id)+'" aria-label="Edit this record">'+
      '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>'+
      '<button class="iconbtn" data-del="'+esc(t.id)+'" aria-label="Delete">'+
      '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>'+
    '</div>'+
    (editingTx === t.id ? txEditor(t, locked) : '')+
  '</div>';
}

function txEditor(t, locked){
  var k = esc(t.id);
  var cats = t.type === "income" ? INCOME_CATS : EXPENSE_CATS;
  var catOpts = cats.map(function(c){
    return '<option value="'+esc(c)+'"'+(c===t.category?" selected":"")+'>'+esc(c)+'</option>';
  }).join("");
  return '<div style="display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line-soft);padding-top:10px">'+
    '<div class="eyebrow">Edit this record</div>'+
    (locked ? '<p class="note">This record came from a fixed bill or a loan payment. You can change the amount, date and note here; to change what it belongs to, delete it and add it again.</p>' : '')+
    '<div class="grid3">'+
      '<label class="field">Amount<input type="number" inputmode="decimal" step="0.01" min="0" value="'+esc(num(t.amount))+'" data-tedit="'+k+'|amount"></label>'+
      '<label class="field">Currency<select data-tedit="'+k+'|currency">'+curOptions(t.currency||"EUR")+'</select></label>'+
      '<label class="field">Date<input type="date" value="'+esc(t.date||"")+'" data-tedit="'+k+'|date"></label>'+
    '</div>'+
    '<div class="grid2">'+
      '<label class="field">Money in or out<select data-tedit="'+k+'|type"'+(locked?" disabled":"")+'>'+
        '<option value="expense"'+(t.type==="expense"?" selected":"")+'>Money out</option>'+
        '<option value="income"'+(t.type==="income"?" selected":"")+'>Money in</option>'+
      '</select></label>'+
      '<label class="field">Category<select data-tedit="'+k+'|category"'+(locked?" disabled":"")+'>'+catOpts+'</select></label>'+
    '</div>'+
    '<label class="field">Who (for transfers)<input type="text" value="'+esc(t.person||"")+'" data-tedit="'+k+'|person"></label>'+
    '<label class="field">Note<input type="text" value="'+esc(t.note||"")+'" data-tedit="'+k+'|note"></label>'+
    '<div class="btnrow"><button class="btn sm" data-tdone="'+k+'">Done</button></div>'+
  '</div>';
}

function renderSpend(){
  var list = monthTx(curMonth).slice().sort(function(a,b){
    return String(b.date).localeCompare(String(a.date));
  });
  var filter = $("spFilter").value;
  if(filter && filter !== "__all") list = list.filter(function(t){ return t.category === filter; });
  $("spCount").textContent = list.length + (list.length===1?" record":" records");
  $("spList").innerHTML = list.length ? list.map(txRow).join("")
    : '<div class="empty">Nothing here yet. Add your first record above.</div>';
}

function debtEditor(d){
  var k = esc(d.id);
  return '<div style="display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line-soft);padding-top:10px">'+
    '<div class="eyebrow">Edit this loan</div>'+
    '<label class="field">Title<input type="text" value="'+esc(d.lender||"")+'" data-dedit="'+k+'|lender"></label>'+
    '<div class="grid2">'+
      '<label class="field">Which way<select data-dedit="'+k+'|direction">'+
        '<option value="iowe"'+(isOwedToMe(d)?"":" selected")+'>I owe someone</option>'+
        '<option value="theyowe"'+(isOwedToMe(d)?" selected":"")+'>Someone owes me</option>'+
      '</select></label>'+
      '<label class="field">Kind of loan<select data-dedit="'+k+'|type">'+typeOptions(d.type || "Other")+'</select></label>'+
    '</div>'+
    '<div class="grid2">'+
      '<label class="field">'+(isOwedToMe(d)?"Who owes you":"Who you owe it to")+'<input type="text" value="'+esc(d.who||"")+'" data-dedit="'+k+'|who"></label>'+
      '<label class="field">Amount'+'<input type="number" inputmode="decimal" step="0.01" min="0" value="'+esc(num(d.original))+'" data-dedit="'+k+'|originalB"></label>'+
    '</div>'+
    '<label class="field">Currency<select data-dedit="'+k+'|currency">'+curOptions(d.currency||"EUR")+'</select></label>'+
    '<label class="field">Note<input type="text" value="'+esc(d.note||"")+'" data-dedit="'+k+'|note"></label>'+
    '<div class="btnrow"><button class="btn sm" data-ddone="'+k+'">Done</button></div>'+
  '</div>';
}

function renderDebt(){
  var totals = {iowe:{left:0, paid:0}, theyowe:{left:0, paid:0}};

  function debtCard(d){
    var r = debtRemaining(d);
    var dir = d.direction || "iowe";
    totals[dir].left += r.left; totals[dir].paid += r.paid;
    var p = r.original > 0 ? Math.min(100, r.paid/r.original*100) : 0;
    return '<div style="display:flex;flex-direction:column;gap:8px">'+
      '<div class="row"><div class="grow"><div class="name">'+esc(d.lender || "Untitled loan")+'</div>'+
      '<div class="meta">'+esc([d.type, d.who, d.note, (d.currency||"EUR") !== (S.settings.mainCurrency||"EUR")
          ? (isOwedToMe(d) ? "lent as " : "borrowed as ")+money(r.raw, d.currency||"EUR") : ""].filter(Boolean).join(" · "))+'</div></div>'+
      '<div style="text-align:right"><div class="num">'+money(r.left)+'</div>'+
      '<div class="meta">of '+money(r.original)+'</div></div></div>'+
      '<div class="bar"><i class="good" style="width:'+p+'%"></i></div>'+
      '<div class="row">'+
        '<input type="number" inputmode="decimal" step="0.01" min="0" placeholder="'+(isOwedToMe(d)?"Got back":"Payment")+'" data-pay-input="'+esc(d.id)+'">'+
        '<select data-pay-cur="'+esc(d.id)+'" style="max-width:92px">'+curOptions(d.currency || S.settings.mainCurrency)+'</select>'+
        '<button class="btn sm" data-pay="'+esc(d.id)+'">'+(isOwedToMe(d)?"Received":"Pay")+'</button>'+
        '<button class="iconbtn" data-dopen="'+esc(d.id)+'" aria-label="Edit this loan">'+
        '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>'+
        '<button class="iconbtn" data-deldebt="'+esc(d.id)+'" aria-label="Delete debt">'+
        '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>'+
      '</div>'+
      (editingDebt === d.id ? debtEditor(d) : '')+
      '</div>';
  }

  var owe = debtsByDir("iowe").map(debtCard).join("");
  var owed = debtsByDir("theyowe").map(debtCard).join("");
  $("dList").innerHTML = owe ||
    '<div class="empty">Nothing here. Alhamdulillah. Use &ldquo;Add a loan&rdquo; below if you borrow.</div>';
  $("dOwedList").innerHTML = owed ||
    '<div class="empty">Nobody owes you anything yet. Add a loan below and pick &ldquo;Someone owes me&rdquo;.</div>';
  $("dTotal").textContent = money(totals.iowe.left);
  $("dOwed").textContent = money(totals.theyowe.left);
  $("dPaid").textContent = money(totals.iowe.paid);
  $("dOweRight").textContent = debtsByDir("iowe").length + " open";
  $("dOwedRight").textContent = debtsByDir("theyowe").length + " open";

  var sends = S.tx.filter(function(t){ return SEND_CATS.indexOf(t.category) >= 0; });
  var monthSends = sends.filter(function(t){ return String(t.date||"").slice(0,7) === curMonth; });
  $("dSent").textContent = money(sumTx(monthSends,"expense"));
  var yearTotal = sends.filter(function(t){ return String(t.date||"").slice(0,4) === curMonth.slice(0,4); })
                       .reduce(function(a,t){ return a + txMain(t); },0);
  $("sendRight").textContent = money(yearTotal) + " in " + curMonth.slice(0,4);

  var recent = sends.slice().sort(function(a,b){ return String(b.date).localeCompare(String(a.date)); }).slice(0,12);
  $("sendList").innerHTML = recent.length ? recent.map(txRow).join("")
    : '<div class="empty">No transfers recorded yet.</div>';
}

function zakatNumbers(){
  var z = S.zakat, st = S.settings;
  var gold = num(z.gold) * num(st.goldPerGram);
  var silver = num(z.silver) * num(st.silverPerGram);
  var abroad = toMain(num(z.other), z.otherCur || "BDT");
  var assets = num(z.cash) + num(z.bank) + gold + silver + num(z.lent) + num(z.invest) + abroad;
  var net = assets - num(z.debts);
  var nisab = st.nisabBase === "gold"
    ? NISAB_GOLD_G * num(st.goldPerGram)
    : NISAB_SILVER_G * num(st.silverPerGram);
  var due = net >= nisab && nisab > 0;
  return {goldValue:gold, silverValue:silver, assets:assets, net:net, nisab:nisab, due:due, amount: due ? net*0.025 : 0};
}

function renderZakat(){
  var z = S.zakat, st = S.settings;
  $("zCash").value = z.cash || ""; $("zBank").value = z.bank || "";
  $("zGold").value = z.gold || ""; $("zSilver").value = z.silver || "";
  $("zLent").value = z.lent || ""; $("zInvest").value = z.invest || "";
  $("zDebts").value = z.debts || "";
  $("zOther").value = z.other || "";
  $("zOtherCur").value = z.otherCur || "BDT";
  $("zHawl").value = z.hawlStart || "";
  $("zBase").value = st.nisabBase;
  $("zGoldPrice").value = st.goldPerGram;
  $("zSilverPrice").value = st.silverPerGram;
  updateZakat();
}

function updateZakat(){
  var r = zakatNumbers();
  $("zNisabRight").textContent = money(r.nisab);
  $("zStatus").textContent = r.due ? money(r.amount) : "Not due";
  $("zStatusSub").textContent = r.due
    ? "2.5% of " + money(r.net) + ". Check the hawl date below."
    : "Your net wealth is below nisab (" + money(r.nisab) + ").";

  var rows = [
    ["Cash and bank", num(S.zakat.cash)+num(S.zakat.bank)],
    ["Gold value", r.goldValue],
    ["Silver value", r.silverValue],
    ["Money owed to you", num(S.zakat.lent)],
    ["Investments", num(S.zakat.invest)],
    ["Savings held abroad", toMain(num(S.zakat.other), S.zakat.otherCur || "BDT")],
    ["Total assets", r.assets],
    ["Minus short-term debt", -num(S.zakat.debts)],
    ["Net zakatable wealth", r.net],
    ["Nisab limit", r.nisab],
    ["Zakat (2.5%)", r.amount]
  ];
  $("zResult").innerHTML = rows.map(function(x, i){
    var bold = (i === 8 || i === 10) ? "font-weight:600;" : "";
    return '<div class="row"><div class="grow name" style="'+bold+'">'+esc(x[0])+'</div>'+
      '<div class="num" style="'+bold+'">'+money(x[1])+'</div></div>';
  }).join("");

  var hs = S.zakat.hawlStart;
  if(hs){
    var start = new Date(hs + "T00:00:00");
    var end = new Date(start.getTime() + HAWL_DAYS*86400000);
    var daysToGo = Math.ceil((end - new Date())/86400000);
    $("zHawlNote").textContent = daysToGo > 0
      ? "One lunar year ends on " + end.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}) + " — " + daysToGo + " days to go."
      : "One lunar year was completed on " + end.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}) + ". If you were at or above nisab the whole time, zakat is due.";
  }else{
    $("zHawlNote").textContent = "Zakat is due after your wealth stays at or above nisab for one lunar year (354 days).";
  }
}

function renderSettings(){
  var st = S.settings;
  $("setMainCur").value = st.mainCurrency || "EUR";
  $("rateUSD").value = st.rates.USD || "";
  $("rateBDT").value = st.rates.BDT || "";
  $("setFreeze").checked = !!st.freezeRates;
  $("curRight").textContent = st.mainCurrency || "EUR";
  $("ratesNote").textContent = st.ratesUpdated
    ? "Rates last updated " + st.ratesUpdated + ". You can type your own instead."
    : "Rates have not been fetched yet. The starting values are only a guess — update them.";
  $("setIncome").value = st.monthlyIncome || "";
  $("setDonation").value = st.donationGoal || "";
  $("setSemFee").value = st.semesterFee || "";
  $("setSemMonths").value = st.semesterMonths || 6;
  var per = num(st.semesterMonths) > 0 ? num(st.semesterFee)/num(st.semesterMonths) : 0;
  $("setSemNote").textContent = "Save " + money(per) + " every month and the semester fee is ready when it arrives.";
  $("setScriptUrl").value = st.scriptUrl || "";
  $("setSecret").value = st.secret || "";
  $("setAutoSync").checked = !!st.autoSync;
  $("syncState").textContent = (st.scriptUrl && st.secret) ? "connected" : "not connected";
  $("sheetLinkNote").innerHTML = st.sheetUrl
    ? 'Your sheet: <a href="'+esc(st.sheetUrl)+'" target="_blank" rel="noopener">open in Google Sheets</a>'
    : "Connect first. The sheet is created automatically in your Drive.";

  $("setFixed").innerHTML = S.fixedCosts.map(function(f){
    return '<div class="row">'+
      '<input type="checkbox" data-fcactive="'+esc(f.id)+'"'+(f.active!==false?" checked":"")+' aria-label="Active">'+
      '<input type="text" class="grow" value="'+esc(f.name)+'" data-fcname="'+esc(f.id)+'">'+
      '<input type="number" inputmode="decimal" step="0.01" min="0" style="max-width:84px" value="'+esc(num(f.amount))+'" data-fcamount="'+esc(f.id)+'">'+
      '<select data-fccur="'+esc(f.id)+'" style="max-width:84px">'+curOptions(f.currency || "EUR")+'</select>'+
      '<button class="iconbtn" data-fcdel="'+esc(f.id)+'" aria-label="Delete bill">'+
      '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></div>';
  }).join("") || '<div class="empty">No bills yet.</div>';

  $("setBudgets").innerHTML = EXPENSE_CATS.map(function(c){
    var lim = num(S.budgets[c]);
    var a = S.alerts[c] || {};
    var rows = '<div class="limitrow"><div class="name">'+esc(c)+'</div>';
    if(lim > 0){
      rows += '<div class="heads"><div>Limit</div><div>YOLO at</div><div>Stop at</div></div>'+
        '<div class="inputs">'+
          '<input type="number" inputmode="decimal" step="1" min="0" value="'+esc(lim)+'" placeholder="0" data-budget="'+esc(c)+'">'+
          '<input type="number" inputmode="decimal" step="1" min="0" value="'+esc(num(a.warn)||"")+'" placeholder="'+Math.round(lim*0.75)+'" data-alert="'+esc(c)+'|warn">'+
          '<input type="number" inputmode="decimal" step="1" min="0" value="'+esc(num(a.stop)||"")+'" placeholder="'+Math.round(lim*0.90)+'" data-alert="'+esc(c)+'|stop">'+
        '</div>';
    }else{
      rows += '<div class="inputs"><input type="number" inputmode="decimal" step="1" min="0" value="" placeholder="no limit" data-budget="'+esc(c)+'"></div>';
    }
    return rows + '</div>';
  }).join("");
}

function renderLearn(){
  $("learnList").innerHTML = LEARN.map(function(x){
    return '<div class="card"><div class="eyebrow">Note</div><h3 style="font-size:var(--t-lg)">'+esc(x.t)+'</h3>'+
      '<p class="note" style="color:var(--fg-soft)">'+esc(x.b)+'</p></div>';
  }).join("");
}

function renderNews(items, msg){
  var el = $("newsList");
  if(msg){ el.innerHTML = '<div class="empty">'+esc(msg)+'</div>'; return; }
  if(!items || !items.length){ el.innerHTML = '<div class="empty">No stories came back. Try Refresh in a minute.</div>'; return; }
  el.innerHTML = items.map(function(it){
    var when = "";
    if(it.date){ var d = new Date(it.date); if(!isNaN(d)) when = d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}); }
    return '<div class="news-item">'+
      '<a href="'+esc(it.link)+'" target="_blank" rel="noopener">'+esc(it.title)+'</a>'+
      '<div class="meta">'+esc(it.source||"")+(when?" · "+esc(when):"")+'</div>'+
      (it.summary ? '<p class="note">'+esc(it.summary)+'</p>' : '')+
    '</div>';
  }).join("");
}

/* ---------------- google sheets ---------------- */
var syncTimer = null;
function queueSync(){
  clearTimeout(syncTimer);
  syncTimer = setTimeout(function(){ pushToSheet(true); }, 4000);
}
function callScript(payload){
  var url = S.settings.scriptUrl;
  if(!url) return Promise.reject(new Error("No Google Sheet URL saved yet."));
  if(!S.settings.secret) return Promise.reject(new Error("Type your secret word in Settings first."));
  var body = Object.assign({}, payload, {secret: S.settings.secret});
  return fetch(url, {
    method: "POST",
    headers: {"Content-Type":"text/plain;charset=utf-8"},
    body: JSON.stringify(body)
  }).then(function(r){ return r.text(); }).then(function(text){
    var j;
    try{ j = JSON.parse(text); }
    catch(e){
      throw new Error("Google sent back a login page instead of your data. In the script, redeploy with “Who has access: Anyone”.");
    }
    if(!j || !j.ok) throw new Error(j && j.error ? j.error : "The script replied with an error.");
    return j;
  }, function(){
    throw new Error("Could not reach the script. Check the URL and your internet.");
  });
}
function pushToSheet(quiet){
  var safeSettings = Object.assign({}, S.settings);
  delete safeSettings.secret;
  delete safeSettings.scriptUrl;
  return callScript({action:"save", data:{
    settings: safeSettings, fixedCosts: S.fixedCosts, budgets: S.budgets, alerts: S.alerts,
    tx: S.tx, debts: S.debts, zakat: S.zakat
  }}).then(function(j){
    if(j.saved && j.saved.sheetUrl){ S.settings.sheetUrl = j.saved.sheetUrl; }
    try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); }catch(e){}
    if(!quiet) toast("Saved to your Google Sheet.");
  }).catch(function(e){
    toast(quiet ? "Auto-save failed: " + e.message : e.message);
  });
}
function pullFromSheet(){
  return callScript({action:"load"}).then(function(j){
    var d = j.data || {};
    if(d.settings && Object.keys(d.settings).length){
      var keepUrl = S.settings.scriptUrl;
      var keepSecret = S.settings.secret;
      S.settings = Object.assign({}, S.settings, d.settings);
      S.settings.scriptUrl = keepUrl;
      S.settings.secret = keepSecret;
    }
    if(Array.isArray(d.fixedCosts) && d.fixedCosts.length) S.fixedCosts = d.fixedCosts;
    if(d.budgets && Object.keys(d.budgets).length) S.budgets = d.budgets;
    if(d.alerts && Object.keys(d.alerts).length) S.alerts = d.alerts;
    if(Array.isArray(d.tx)) S.tx = d.tx;
    if(Array.isArray(d.debts)) S.debts = d.debts;
    if(d.zakat && Object.keys(d.zakat).length) S.zakat = Object.assign({}, S.zakat, d.zakat);
    if(d.sheetUrl) S.settings.sheetUrl = d.sheetUrl;
    S = mergeDefaults(S);
    try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); }catch(e){}
    render();
    toast("Loaded from your Google Sheet.");
  }).catch(function(e){ toast(e.message); });
}
function loadNews(force){
  if(newsCache && !force){ renderNews(newsCache); return; }
  if(!S.settings.scriptUrl){
    renderNews(null, "Connect your Google Sheet in Settings first. The script fetches the news for you.");
    return;
  }
  renderNews(null, "Loading…");
  callScript({action:"news", feeds:S.settings.feeds}).then(function(j){
    newsCache = j.items || [];
    $("newsStamp").textContent = "Updated " + new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
    renderNews(newsCache);
  }).catch(function(e){ renderNews(null, e.message); });
}

/* ---------------- events ---------------- */
function showScreen(name){
  activeScreen = name;
  ["home","spend","debt","zakat","news","settings"].forEach(function(s){
    var el = $("scr-"+s); if(el) el.hidden = (s !== name);
  });
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function(b){
    b.setAttribute("aria-selected", b.dataset.scr === name ? "true" : "false");
  });
  window.scrollTo({top:0, behavior:"auto"});
  render();
  if(name === "news") loadNews(false);
  if(name === "settings") loadScriptCode();
}

document.querySelectorAll(".tab").forEach(function(b){
  b.addEventListener("click", function(){ showScreen(b.dataset.scr); });
});
$("btnSettings").addEventListener("click", function(){ showScreen("settings"); });

$("btnTheme").addEventListener("click", function(){
  var cur = document.documentElement.getAttribute("data-theme");
  var next = cur === "dark" ? "light" : (cur === "light" ? "dark" : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark"));
  document.documentElement.setAttribute("data-theme", next);
  try{ localStorage.setItem(THEME_KEY, next); }catch(e){}
});

$("mPrev").addEventListener("click", function(){ curMonth = shiftMonth(curMonth,-1); render(); });
$("mNext").addEventListener("click", function(){ curMonth = shiftMonth(curMonth, 1); render(); });

/* --- spending --- */
document.querySelectorAll("#txTypeSeg button").forEach(function(b){
  b.addEventListener("click", function(){
    txType = b.dataset.type;
    document.querySelectorAll("#txTypeSeg button").forEach(function(x){
      x.setAttribute("aria-selected", x === b ? "true" : "false");
    });
    fillSelect($("txCat"), txType === "income" ? INCOME_CATS : EXPENSE_CATS);
    togglePerson();
  });
});
function togglePerson(){
  var c = $("txCat").value;
  $("txPersonWrap").hidden = !(txType === "expense" && SEND_CATS.indexOf(c) >= 0);
}
$("txCat").addEventListener("change", togglePerson);

$("txAdd").addEventListener("click", function(){
  var amt = num($("txAmount").value);
  if(amt <= 0){ toast("Type an amount first."); return; }
  var cur = $("txCur").value || "EUR";
  S.tx.push({
    id: uid(), date: $("txDate").value || todayISO(), type: txType,
    category: $("txCat").value, amount: amt, currency: cur, rate: rateOf(cur),
    note: $("txNote").value.trim(), person: $("txPerson").value.trim(),
    fixedId: "", debtId: ""
  });
  persist();
  $("txAmount").value = ""; $("txNote").value = ""; $("txPerson").value = "";
  var cat = $("txCat").value;
  var st = (txType === "expense") ? budgetState(cat, curMonth) : null;
  if(st && st.level === "over")      toast("Added. " + cat + ": " + money(Math.abs(st.left)) + " over your limit.");
  else if(st && st.level === "stop") toast("Added. " + cat + ": only " + money(st.left) + " left. Stop here.");
  else if(st && st.level === "yolo") toast("Added. YOLO \u2014 " + money(st.left) + " left for " + cat + ".");
  else                               toast("Added.");
  render();
});
$("spFilter").addEventListener("change", renderSpend);

/* --- delegated clicks --- */
document.addEventListener("click", function(ev){
  var el = ev.target.closest("[data-fixed],[data-del],[data-pay],[data-deldebt],[data-fcdel],[data-dopen],[data-ddone],[data-topen],[data-tdone]");
  if(!el) return;

  if(el.dataset.topen){
    editingTx = (editingTx === el.dataset.topen) ? "" : el.dataset.topen;
    render(); return;
  }
  if(el.dataset.tdone){
    editingTx = ""; persist(); render(); toast("Record updated."); return;
  }

  if(el.dataset.dopen){
    editingDebt = (editingDebt === el.dataset.dopen) ? "" : el.dataset.dopen;
    render(); return;
  }
  if(el.dataset.ddone){
    editingDebt = ""; persist(); render(); toast("Loan updated."); return;
  }

  if(el.dataset.fixed){
    var fc = S.fixedCosts.filter(function(f){ return f.id === el.dataset.fixed; })[0];
    if(!fc) return;
    if(isFixedPaid(fc, curMonth)){
      S.tx = S.tx.filter(function(t){
        return !(t.fixedId === fc.id && String(t.date||"").slice(0,7) === curMonth);
      });
      toast("Marked as not paid.");
    }else{
      var day = (curMonth === todayISO().slice(0,7)) ? todayISO() : curMonth + "-01";
      var fcCur = fc.currency || "EUR";
      S.tx.push({id:uid(), date:day, type:"expense", category:fc.category,
        amount:num(fc.amount), currency:fcCur, rate:rateOf(fcCur),
        note:fc.name, person:"", fixedId:fc.id, debtId:""});
      toast(fc.name + " marked paid.");
    }
    persist(); render(); return;
  }

  if(el.dataset.del){
    if(editingTx === el.dataset.del) editingTx = "";
    S.tx = S.tx.filter(function(t){ return t.id !== el.dataset.del; });
    persist(); render(); toast("Deleted."); return;
  }

  if(el.dataset.pay){
    var id = el.dataset.pay;
    var input = document.querySelector('[data-pay-input="'+id+'"]');
    var curSel = document.querySelector('[data-pay-cur="'+id+'"]');
    var amt = num(input && input.value);
    if(amt <= 0){ toast("Type the payment amount."); return; }
    var payCur = (curSel && curSel.value) || "EUR";
    var theDebt = S.debts.filter(function(d){ return d.id === id; })[0];
    var back = theDebt && isOwedToMe(theDebt);
    S.tx.push({id:uid(), date:todayISO(),
      type: back ? "income" : "expense",
      category: back ? "Loan repaid to me" : "Debt repayment",
      amount:amt, currency:payCur, rate:rateOf(payCur),
      note: back ? "Money returned to me" : "Debt payment",
      person: (theDebt && theDebt.who) || "", fixedId:"", debtId:id});
    persist(); render(); toast(back ? "Money received." : "Payment recorded."); return;
  }

  if(el.dataset.deldebt){
    var did = el.dataset.deldebt;
    if(editingDebt === did) editingDebt = "";
    S.debts = S.debts.filter(function(d){ return d.id !== did; });
    S.tx = S.tx.filter(function(t){ return t.debtId !== did; });
    persist(); render(); toast("Debt removed."); return;
  }

  if(el.dataset.fcdel){
    S.fixedCosts = S.fixedCosts.filter(function(f){ return f.id !== el.dataset.fcdel; });
    persist(); render(); return;
  }
});

/* --- debt --- */
function paintDebtForm(){
  var owed = debtDir === "theyowe";
  $("dWhoWrap").childNodes[0].nodeValue = owed ? "Who owes you" : "Who you owe it to";
  $("dAmountWrap").childNodes[0].nodeValue = owed ? "Amount you lent" : "Amount borrowed";
  $("dWho").placeholder = owed ? "Person who took it" : "Person, bank or office";
}
document.querySelectorAll("#dDirSeg button").forEach(function(b){
  b.addEventListener("click", function(){
    debtDir = b.dataset.dir;
    document.querySelectorAll("#dDirSeg button").forEach(function(x){
      x.setAttribute("aria-selected", x === b ? "true" : "false");
    });
    paintDebtForm();
  });
});
$("dAdd").addEventListener("click", function(){
  var name = $("dLender").value.trim();
  var amt = num($("dAmount").value);
  if(!name){ toast("Give the loan a title first."); return; }
  if(amt <= 0){ toast(debtDir === "theyowe" ? "Type the amount you lent." : "Type the amount you borrowed."); return; }
  S.debts.push({id:uid(), lender:name, direction:debtDir, type:$("dType").value, who:$("dWho").value.trim(),
    original:amt, currency:$("dCur").value || "EUR",
    note:$("dNote").value.trim(), createdAt:todayISO()});
  $("dLender").value=""; $("dAmount").value=""; $("dNote").value=""; $("dWho").value="";
  persist(); render(); toast(debtDir === "theyowe" ? "Added to money owed to you." : "Loan added.");
});
$("sendAdd").addEventListener("click", function(){
  var p = $("sendPerson").value.trim();
  var amt = num($("sendAmount").value);
  if(amt <= 0){ toast("Type an amount first."); return; }
  var sCur = $("sendCur").value || "EUR";
  S.tx.push({id:uid(), date:$("sendDate").value || todayISO(), type:"expense",
    category:$("sendCat").value, amount:amt, currency:sCur, rate:rateOf(sCur),
    note:"", person:p, fixedId:"", debtId:""});
  $("sendPerson").value=""; $("sendAmount").value="";
  persist(); render(); toast("Transfer recorded.");
});

/* --- zakat --- */
var zMap = {zCash:"cash",zBank:"bank",zGold:"gold",zSilver:"silver",zLent:"lent",zInvest:"invest",zDebts:"debts"};
Object.keys(zMap).forEach(function(id){
  $(id).addEventListener("input", function(){
    S.zakat[zMap[id]] = num($(id).value);
    persist(); updateZakat();
  });
});
$("zOther").addEventListener("input", function(){ S.zakat.other = num($("zOther").value); persist(); updateZakat(); });
$("zOtherCur").addEventListener("change", function(){ S.zakat.otherCur = $("zOtherCur").value; persist(); updateZakat(); });
$("zHawl").addEventListener("change", function(){ S.zakat.hawlStart = $("zHawl").value; persist(); updateZakat(); });
$("zBase").addEventListener("change", function(){ S.settings.nisabBase = $("zBase").value; persist(); updateZakat(); });
$("zGoldPrice").addEventListener("input", function(){ S.settings.goldPerGram = num($("zGoldPrice").value); persist(); updateZakat(); });
$("zSilverPrice").addEventListener("input", function(){ S.settings.silverPerGram = num($("zSilverPrice").value); persist(); updateZakat(); });
$("zUseDebt").addEventListener("click", function(){
  var total = debtsByDir("iowe").reduce(function(a,d){ return a + debtRemaining(d).left; },0);
  S.zakat.debts = round2(total); $("zDebts").value = round2(total); persist(); updateZakat();
  toast("Used your total remaining debt.");
});
$("zUseLent").addEventListener("click", function(){
  var total = debtsByDir("theyowe").reduce(function(a,d){ return a + debtRemaining(d).left; },0);
  S.zakat.lent = round2(total); $("zLent").value = round2(total); persist(); updateZakat();
  toast("Used what people still owe you.");
});
$("zFetchPrice").addEventListener("click", function(){
  if(!S.settings.scriptUrl){ toast("Connect your Google Sheet first, then prices can be fetched."); return; }
  $("zPriceNote").textContent = "Checking…";
  callScript({action:"metals"}).then(function(j){
    var m = j.metals || {};
    if(m.goldPerGram) S.settings.goldPerGram = round2(toMain(m.goldPerGram, "EUR"));
    if(m.silverPerGram) S.settings.silverPerGram = round2(toMain(m.silverPerGram, "EUR"));
    $("zGoldPrice").value = S.settings.goldPerGram;
    $("zSilverPrice").value = S.settings.silverPerGram;
    persist(); updateZakat();
    $("zPriceNote").textContent = m.goldPerGram
      ? "Updated just now from " + (m.source || "the market feed") + ". Always check against a local dealer."
      : "Could not read a live price. Please type today's price yourself.";
  }).catch(function(e){ $("zPriceNote").textContent = e.message; });
});

/* --- news / learn --- */
document.querySelectorAll("#newsSeg button").forEach(function(b){
  b.addEventListener("click", function(){
    var v = b.dataset.view;
    document.querySelectorAll("#newsSeg button").forEach(function(x){
      x.setAttribute("aria-selected", x === b ? "true" : "false");
    });
    $("newsView").hidden = v !== "news";
    $("learnView").hidden = v !== "learn";
    if(v === "news") loadNews(false);
  });
});
$("newsRefresh").addEventListener("click", function(){ loadNews(true); });

/* --- settings --- */
var setMap = {setIncome:"monthlyIncome", setDonation:"donationGoal", setSemFee:"semesterFee", setSemMonths:"semesterMonths"};
Object.keys(setMap).forEach(function(id){
  $(id).addEventListener("change", function(){
    S.settings[setMap[id]] = num($(id).value);
    persist(); renderSettings();
  });
});
$("setScriptUrl").addEventListener("change", function(){
  S.settings.scriptUrl = $("setScriptUrl").value.trim();
  persist(); renderSettings();
});
$("setSecret").addEventListener("change", function(){
  S.settings.secret = $("setSecret").value.trim();
  persist(); renderSettings();
});
$("setAutoSync").addEventListener("change", function(){
  S.settings.autoSync = $("setAutoSync").checked; persist();
});

/* --- currency --- */
function convertStoredAmounts(oldC, newC){
  var f = rateOf(newC) / rateOf(oldC);
  if(!isFinite(f) || f <= 0) return;
  ["monthlyIncome","donationGoal","semesterFee","goldPerGram","silverPerGram"].forEach(function(k){
    S.settings[k] = round2(num(S.settings[k]) * f);
  });
  Object.keys(S.budgets).forEach(function(c){ S.budgets[c] = round2(num(S.budgets[c]) * f); });
  ["cash","bank","lent","invest","debts"].forEach(function(k){
    S.zakat[k] = round2(num(S.zakat[k]) * f);
  });
}
$("setMainCur").addEventListener("change", function(){
  var oldC = S.settings.mainCurrency || "EUR";
  var newC = $("setMainCur").value;
  if(newC === oldC) return;
  convertStoredAmounts(oldC, newC);
  S.settings.mainCurrency = newC;
  persist(); render();
  toast("Everything now shows in " + curInfo(newC).name + ".");
});
$("rateUSD").addEventListener("change", function(){
  S.settings.rates.USD = num($("rateUSD").value) || 1; persist(); render();
});
$("rateBDT").addEventListener("change", function(){
  S.settings.rates.BDT = num($("rateBDT").value) || 1; persist(); render();
});
$("setFreeze").addEventListener("change", function(){
  S.settings.freezeRates = $("setFreeze").checked; persist(); render();
});
$("ratesFetch").addEventListener("click", function(){
  if(!S.settings.scriptUrl){ toast("Connect your Google Sheet first, then rates can be fetched."); return; }
  $("ratesNote").textContent = "Checking\u2026";
  callScript({action:"rates"}).then(function(j){
    var fx = j.fx || {};
    var got = [];
    if(fx.rates && fx.rates.USD){ S.settings.rates.USD = fx.rates.USD; got.push("USD"); }
    if(fx.rates && fx.rates.BDT){ S.settings.rates.BDT = fx.rates.BDT; got.push("BDT"); }
    if(got.length){
      S.settings.ratesUpdated = new Date().toLocaleString("en-GB");
      persist(); render();
      $("ratesNote").textContent = got.length === 2
        ? "Updated from " + (fx.source || "the rate feed") + "."
        : "Only USD came back. Please type the BDT rate yourself.";
    }else{
      $("ratesNote").textContent = "No rate came back. Please type the rates yourself.";
    }
  }).catch(function(e){ $("ratesNote").textContent = e.message; });
});
$("syncTest").addEventListener("click", function(){
  $("syncState").textContent = "testing…";
  callScript({action:"ping"}).then(function(j){
    S.settings.sheetUrl = j.sheetUrl || "";
    persist(); renderSettings(); toast("Connected. Your sheet is ready.");
  }).catch(function(e){ $("syncState").textContent = "failed"; toast(e.message); });
});
$("syncPush").addEventListener("click", function(){ pushToSheet(false); });
$("syncPull").addEventListener("click", function(){ pullFromSheet(); });

document.addEventListener("change", function(ev){
  var t = ev.target;
  if(t.dataset && t.dataset.fcname !== undefined && t.dataset.fcname){
    S.fixedCosts.forEach(function(f){ if(f.id === t.dataset.fcname) f.name = t.value; });
    persist(); return;
  }
  if(t.dataset && t.dataset.fcamount){
    S.fixedCosts.forEach(function(f){ if(f.id === t.dataset.fcamount) f.amount = num(t.value); });
    persist(); return;
  }
  if(t.dataset && t.dataset.tedit){
    var tp = String(t.dataset.tedit).split("|");
    var retype = false;
    S.tx.forEach(function(x){
      if(x.id !== tp[0]) return;
      if(tp[1] === "amount"){ x.amount = num(t.value); }
      else if(tp[1] === "currency"){ x.currency = t.value; x.rate = rateOf(t.value); }
      else if(tp[1] === "type"){
        x.type = t.value;
        var allowed = (t.value === "income") ? INCOME_CATS : EXPENSE_CATS;
        if(allowed.indexOf(x.category) < 0) x.category = allowed[0];
        retype = true;
      }
      else { x[tp[1]] = t.value; }
    });
    persist();
    /* Only redraw when the category list itself has to change. Otherwise the
       row would jump under your finger between one field and the next. */
    if(retype) render();
    return;
  }
  if(t.dataset && t.dataset.dedit){
    var parts = String(t.dataset.dedit).split("|");
    S.debts.forEach(function(d){
      if(d.id !== parts[0]) return;
      if(parts[1] === "original" || parts[1] === "originalB") d.original = num(t.value);
      else d[parts[1]] = t.value;
    });
    persist(); return;
  }
  if(t.dataset && t.dataset.fccur){
    S.fixedCosts.forEach(function(f){ if(f.id === t.dataset.fccur) f.currency = t.value; });
    persist(); return;
  }
  if(t.dataset && t.dataset.fcactive){
    S.fixedCosts.forEach(function(f){ if(f.id === t.dataset.fcactive) f.active = t.checked; });
    persist(); return;
  }
  if(t.dataset && t.dataset.budget){
    S.budgets[t.dataset.budget] = num(t.value);
    persist(); renderSettings(); return;
  }
  if(t.dataset && t.dataset.alert){
    var ap = String(t.dataset.alert).split("|");
    if(!S.alerts[ap[0]]) S.alerts[ap[0]] = {};
    S.alerts[ap[0]][ap[1]] = num(t.value);
    persist(); return;
  }
});

$("fcAdd").addEventListener("click", function(){
  var n = $("fcName").value.trim();
  if(!n){ toast("Give the bill a name."); return; }
  S.fixedCosts.push({id:uid(), name:n, amount:num($("fcAmount").value),
    currency:$("fcCur").value || "EUR", category:$("fcCat").value, active:true});
  $("fcName").value=""; $("fcAmount").value="";
  persist(); renderSettings(); toast("Bill added.");
});

/* The Google script lives in finance-sheets-script.gs next to this page.
   In the single-file build it is inlined instead, so check for that first. */
var gsCode = "";
function loadScriptCode(){
  if(gsCode) return Promise.resolve(gsCode);
  var inline = $("gsSource");
  if(inline && inline.textContent.trim()){
    gsCode = inline.textContent.trim();
    $("codeView").textContent = gsCode;
    return Promise.resolve(gsCode);
  }
  return fetch("finance-sheets-script.gs").then(function(r){
    if(!r.ok) throw new Error("not found");
    return r.text();
  }).then(function(t){
    gsCode = t;
    $("codeView").textContent = t;
    return t;
  }).catch(function(){
    $("codeView").textContent = "Could not load finance-sheets-script.gs. Open that file next to this page instead.";
    return "";
  });
}
$("copyCode").addEventListener("click", function(){
  if(!gsCode){ loadScriptCode().then(function(){ selectCode(); }); return; }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(gsCode).then(function(){ toast("Code copied."); }).catch(selectCode);
  }else selectCode();
});
function selectCode(){
  var pre = $("codeView");
  var r = document.createRange(); r.selectNodeContents(pre);
  var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  toast("Copy did not work. The code is selected — copy it by hand.");
}

$("backupShow").addEventListener("click", function(){ $("backupBox").value = JSON.stringify(S); });
$("backupCopy").addEventListener("click", function(){
  var v = $("backupBox").value || JSON.stringify(S);
  $("backupBox").value = v;
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(v).then(function(){ toast("Backup copied."); }).catch(function(){ $("backupBox").select(); });
  }else $("backupBox").select();
});
$("backupRestore").addEventListener("click", function(){
  try{
    var d = JSON.parse($("backupBox").value);
    S = mergeDefaults(d);
    persist(); render(); toast("Restored.");
  }catch(e){ toast("That text is not a valid backup."); }
});
var resetArmed = false;
$("resetBtn").addEventListener("click", function(){
  if(!resetArmed){
    resetArmed = true;
    $("resetBtn").textContent = "Tap again to erase everything";
    setTimeout(function(){ resetArmed = false; $("resetBtn").textContent = "Erase everything"; }, 5000);
    return;
  }
  S = freshData(); persist(); render(); toast("Everything erased.");
  resetArmed = false; $("resetBtn").textContent = "Erase everything";
});

/* ---------------- start ---------------- */
(function init(){
  try{
    var th = localStorage.getItem(THEME_KEY);
    if(th) document.documentElement.setAttribute("data-theme", th);
  }catch(e){}

  fillSelect($("txCat"), EXPENSE_CATS);
  fillSelect($("fcCat"), EXPENSE_CATS);
  var main = S.settings.mainCurrency || "EUR";
  fillCurSelect($("txCur"), main);
  fillCurSelect($("dCur"), main);
  fillSelect($("dType"), DEBT_TYPES, "Blocked account (Sperrkonto)");
  paintDebtForm();
  fillCurSelect($("sendCur"), main);
  fillCurSelect($("fcCur"), main);
  fillCurSelect($("zOtherCur"), S.zakat.otherCur || "BDT");
  fillCurSelect($("setMainCur"), main, true);
  fillSelect($("spFilter"), ["__all"].concat(EXPENSE_CATS, INCOME_CATS));
  $("spFilter").options[0].textContent = "All categories";
  $("txDate").value = todayISO();
  $("sendDate").value = todayISO();
  renderLearn();
  showScreen("home");
})();
