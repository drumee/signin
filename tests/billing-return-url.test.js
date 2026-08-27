// The post-login navigation, and the destination it has to carry.
//
// THIS FILE EXISTS BECAUSE THIS CODE BROKE SIGN-IN ONCE. The billing
// destination is handed back on the URL so it survives the host switch the
// router performs for any account on its own team-NNNN subdomain — and the
// first version did that with:
//
//   if (back) return location.replace(back);
//   location.reload();
//
// A navigation that differs only in the FRAGMENT is a SAME-DOCUMENT
// navigation: replace() moves the hash and does not reload. So on the one path
// that mattered — a visitor arriving from a campaign link — the early return
// skipped the reload, the app never re-booted, and the visitor sat on the
// sign-in form holding a valid session.
//
// The property to protect is therefore not "the URL is right". It is "the page
// always reloads, whether or not there is a destination to carry".
//
// Run: node --test tests/billing-return-url.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const SRC = readFileSync(join(__dirname, "../src/widgets/form/index.js"), "utf8");

const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const HELPER = /function billingReturnUrl\(\) \{[\s\S]*?\n\}/.exec(SRC);
assert.ok(HELPER, "billingReturnUrl is gone");

/** The real helper, against stubbed storage and location. */
function call(intent, loc = {
  origin: "https://drumee.in", pathname: "/-/huan/", search: "", hash: "#/welcome/signin",
}) {
  return new Function("sessionStorage", "location",
    `${HELPER[0]}; return billingReturnUrl();`
  )({ getItem: () => intent }, loc);
}

const FULL = JSON.stringify({
  plan: "team", cycle: "monthly", tab: "checkout", promo: "EMAILMKT270826_2",
});

// ── the property that broke: the page must always reload ───────────────
test("the reload is unconditional — replace() alone would not re-boot", () => {
  const ok = stripComments(SRC.slice(SRC.indexOf('case "ok":')));
  const body = ok.slice(0, ok.indexOf("return;"));
  assert.match(body, /location\.reload\(\)/, "the reload is gone");
  assert.ok(!/return\s+location\.replace\(/.test(body),
    "replace() is returned on — a hash-only navigation does not reload, so the "
    + "visitor would keep a session and stay on the sign-in form");
  const rep = body.indexOf("location.replace(");
  const rel = body.indexOf("location.reload()");
  assert.ok(rep > 0 && rel > rep,
    "replace() must come BEFORE reload(): it moves the hash, and the reload is "
    + "what carries that moved hash into a fresh document");
});

// ── the URL it carries ─────────────────────────────────────────────────
test("a full intent becomes an ARG-form url", () => {
  const u = call(FULL);
  assert.ok(u.startsWith("https://drumee.in/-/huan/#/welcome/signin?"), u);
  const q = new URLSearchParams(u.slice(u.indexOf("?") + 1));
  // billing=1 is the ARG form, the one that rides the host switch. The path
  // form (#/desk/billing) would route to billing on the OLD host instead.
  assert.equal(q.get("billing"), "1");
  assert.equal(q.get("plan"), "team");
  assert.equal(q.get("cycle"), "monthly");
  assert.equal(q.get("tab"), "checkout");
  assert.equal(q.get("promo"), "EMAILMKT270826_2");
});

test("only the keys present are carried", () => {
  const u = call(JSON.stringify({ promo: "X1" }));
  assert.equal(u, "https://drumee.in/-/huan/#/welcome/signin?billing=1&promo=X1");
});

test("an existing hash query is rebuilt, not appended to", () => {
  // The 2FA screen arrives as #/welcome/signin?oauth_mfa=1&email=… . Appending
  // would leave two query strings in one fragment, and parseParams would read
  // whichever came first.
  const u = call(JSON.stringify({ plan: "team" }), {
    origin: "https://drumee.in", pathname: "/-/huan/", search: "",
    hash: "#/welcome/signin?oauth_mfa=1&email=a%40b.c",
  });
  assert.equal((u.match(/\?/g) || []).length, 1, `two query strings: ${u}`);
  assert.ok(u.endsWith("#/welcome/signin?billing=1&plan=team"), u);
});

// ── the recipient marker must survive this hop ─────────────────────────
// THE GAP THIS FILE WAS MISSING. The CTA carries `for=<tag>` naming who the
// mail was written for, and the dashboard refuses a link whose tag does not
// match the signed-in account. This function rebuilds the URL from a FIXED key
// list — so a marker absent from that list is dropped exactly where it is
// needed, every link reads as unaddressed on the far side, and the check passes
// by default for anyone. The feature would look present and do nothing.
test("the recipient marker is carried across the host switch", () => {
  const u = call(JSON.stringify({ plan: "team", promo: "P1", for: "cd8f5912" }));
  const q = new URLSearchParams(u.slice(u.indexOf("?") + 1));
  assert.equal(q.get("for"), "cd8f5912",
    "the marker is dropped — any account signing in would get the checkout");
});

test("a link with no marker still works", () => {
  // Absent means "not bound", not "refuse" — links written before the marker
  // existed must keep working.
  const u = call(JSON.stringify({ plan: "team" }));
  assert.ok(!/[?&]for=/.test(u), u);
});

test("every key the deep link defines is carried, none invented", () => {
  // Pinned as a SET rather than case-by-case: this list has been extended twice
  // (promo, then for) and each time the omission was silent.
  const u = call(JSON.stringify({
    plan: "team", cycle: "monthly", tab: "checkout", promo: "P1", for: "cd8f5912",
  }));
  const keys = [...new URLSearchParams(u.slice(u.indexOf("?") + 1)).keys()].sort();
  assert.deepEqual(keys, ["billing", "cycle", "for", "plan", "promo", "tab"],
    "the carried key set changed — a dropped key fails silently on the far side");
});

// ── the OTHER key list: the OAuth dest ─────────────────────────────────
// storedAttribution() builds a `dest` param for google/apple.initiate, which
// loby parks on oauth_state so the destination survives the provider bounce.
// It has its OWN copy of the key list, and a mutation proved it was covered by
// nothing: dropping `for` there passed every case in this file, because the
// cases only exercised billingReturnUrl. Two lists, two chances to lose a key
// silently.
const ATTR = /function storedAttribution\(\) \{[\s\S]*?\n\}/.exec(SRC);
assert.ok(ATTR, "storedAttribution is gone");
const attribution = (intent) => new Function(
  "localStorage", "sessionStorage",
  `${ATTR[0]}; return storedAttribution();`
)({ getItem: () => null }, { getItem: () => intent });

test("the OAuth dest carries the recipient marker too", () => {
  const out = attribution(JSON.stringify({
    plan: "team", cycle: "monthly", tab: "checkout", promo: "P1", for: "cd8f5912",
  }));
  assert.ok(out.dest, "no dest was built");
  const q = new URLSearchParams(out.dest.slice(out.dest.indexOf("?") + 1));
  assert.equal(q.get("for"), "cd8f5912",
    "the marker is dropped on the OAuth path — an addressed link would read as "
    + "unaddressed after the provider bounce");
});

test("both key lists carry the same keys", () => {
  // The two are separate literals in one file and have drifted once already.
  const lists = [...SRC.matchAll(/for \(const k of \[('plan'[^\]]*)\]\)/g)]
    .map((m) => m[1].replace(/['\s]/g, "").split(","));
  assert.equal(lists.length, 2, `expected two deep-link key lists, found ${lists.length}`);
  assert.deepEqual(lists[0], lists[1],
    "the OAuth dest and the return URL carry different keys — one of them is "
    + "silently losing part of the destination");
});

test("the dest degrades without an intent", () => {
  assert.equal(attribution(null).dest, undefined, "a dest was invented with nothing stored");
});

// ── it must never be able to block a sign-in ───────────────────────────
test("no intent, corrupt json and blocked storage all yield null", () => {
  assert.equal(call(null), null, "absent intent");
  assert.equal(call("{not json"), null, "corrupt value");
  const thrown = new Function("sessionStorage", "location",
    `${HELPER[0]}; return billingReturnUrl();`
  )({ getItem() { throw new Error("blocked"); } },
    { origin: "https://x", pathname: "/", search: "", hash: "#/welcome/signin" });
  assert.equal(thrown, null, "private mode / blocked storage must degrade, not throw");
});

test("null, never false — the caller branches on it", () => {
  assert.strictEqual(call(null), null);
  assert.notStrictEqual(call(null), false,
    "a stray boolean reads as a third state that does not exist");
});

test("values are encoded", () => {
  const u = call(JSON.stringify({ promo: "A B&C" }));
  assert.ok(!/promo=A B/.test(u), `unencoded value in ${u}`);
  assert.ok(/promo=A(%20|\+)B%26C/.test(u), u);
});

test("the stored intent is read, never cleared", () => {
  // Clearing belongs to ui-team's billing-deep-link consume(). A sign-in that
  // fails must leave the intent exactly as it was.
  const body = stripComments(HELPER[0]);
  assert.ok(!/removeItem|\.clear\(/.test(body),
    "billingReturnUrl mutates storage — a failed sign-in would lose the destination");
});
