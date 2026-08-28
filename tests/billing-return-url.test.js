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

// Matched on the NAME, not the parameter list. This helper gained `signerEmail`
// when the hand-off became recipient-aware, and a signature-pinned extractor
// failed the whole file for a change that kept every property it tested.
const HELPER = /function billingReturnUrl\([^)]*\) \{[\s\S]*?\n\}/.exec(SRC);
assert.ok(HELPER, "billingReturnUrl is gone");

/**
 * A sessionStorage that actually stores and actually removes.
 *
 * A stub whose getItem returns a constant cannot show whether the helper
 * CLEARS what it read — which is the property that makes the destination
 * single-use, and the one that was missing.
 */
function store(intent) {
  const m = new Map();
  if (intent != null) m.set("drumee_billingDeepLink", intent);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    removeItem: (k) => m.delete(k),
    setItem: (k, v) => m.set(k, v),
    size: () => m.size,
  };
}

// The two helpers billingReturnUrl now leans on.
const TAGFN = /function recipientTag\([^)]*\) \{[\s\S]*?\n\}/.exec(SRC);
const SIGNFN = /function intentIsForSigner\([^)]*\) \{[\s\S]*?\n\}/.exec(SRC);
assert.ok(TAGFN && SIGNFN, "the recipient helpers are gone");
const tag = new Function(`${TAGFN[0]}; return recipientTag;`)();

/**
 * The real helper, against a live store and a stubbed location.
 *
 * `signer` defaults to the address the fixtures are addressed to, so the
 * existing cases keep testing the happy path; the mismatch cases pass their own.
 */
function call(intent, loc = {
  origin: "https://drumee.in", pathname: "/-/huan/", search: "", hash: "#/welcome/signin",
}, ss = null, signer = "a@example.com") {
  return new Function("sessionStorage", "location",
    `${TAGFN[0]} ${SIGNFN[0]} ${HELPER[0]}; return billingReturnUrl(arguments[2]);`
  )(ss || store(intent), loc, signer);
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
  // Addressed to the default signer, so the hand-off actually happens — the
  // marker is only carried for the person the link names.
  const MINE = tag("a@example.com");
  const u = call(JSON.stringify({ plan: "team", promo: "P1", for: MINE }));
  assert.ok(u, "the hand-off was refused for its own recipient");
  const q = new URLSearchParams(u.slice(u.indexOf("?") + 1));
  assert.equal(q.get("for"), MINE,
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
    plan: "team", cycle: "monthly", tab: "checkout", promo: "P1",
    for: tag("a@example.com"),
  }));
  assert.ok(u, "the hand-off was refused for its own recipient");
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

// ── it is handed only to the person the link names ─────────────────────
// THE SCENARIO: a mail to A, clicked, then B signs in. Nothing must happen AND
// the destination must survive — B has not used A's chance. A signs in next, on
// the same tab, and gets it.
//
// This origin is where that matters: the desk runs on the org host after a host
// switch, while Butler.logout brings the visitor back HERE. A copy handed away
// on B's sign-in is exactly the one A would have found.
const ADDRESSED = (to) => JSON.stringify({
  plan: "team", cycle: "monthly", tab: "checkout", promo: "P1", for: tag(to),
});

test("a mismatched signer gets no URL and the intent survives", () => {
  const ss = store(ADDRESSED("a@example.com"));
  assert.equal(call(null, undefined, ss, "b@example.com"), null,
    "B was handed the destination");
  assert.equal(ss.size(), 1,
    "B's sign-in destroyed a destination B was refused — A can never claim it");
});

test("the recipient then gets it, and it is taken", () => {
  const ss = store(ADDRESSED("a@example.com"));
  call(null, undefined, ss, "b@example.com");        // B first, refused
  const url = call(null, undefined, ss, "a@example.com");
  assert.ok(url && url.includes("billing=1"), "A was refused after B's attempt");
  assert.equal(ss.size(), 0, "A's use did not take it — it would replay");
});

test("an unmarked intent is handed to whoever signs in", () => {
  // Absent means "not bound", not "refuse".
  const ss = store(JSON.stringify({ plan: "team" }));
  assert.ok(call(null, undefined, ss, "anyone@example.com"), "an unbound link was refused");
});

test("an unreadable signer address does not discard the intent", () => {
  // Turning a missing profile field into a dead campaign link is the worse
  // failure — it hands off rather than refusing, and does not throw.
  const ss = store(ADDRESSED("a@example.com"));
  assert.ok(call(null, undefined, ss, ""), "a missing signer refused the link");
});

test("the call site passes the address that just signed in", () => {
  // Without it every sign-in looks like the recipient's and the guard is inert.
  const ok = stripComments(SRC.slice(SRC.indexOf('case "ok":')));
  const body = ok.slice(0, ok.indexOf("return;"));
  assert.match(body, /billingReturnUrl\(signer\)/, "the guard is called with no signer");
  assert.match(body, /data\.user\.profile\s*\n?\s*&&\s*data\.user\.profile\.email|data\.user\.profile\.email/,
    "the signer is not read from the signed-in profile");
});

// ── the destination is single-use ──────────────────────────────────────
// THE BUG THIS REPLACED an earlier assertion for. That one required the helper
// NOT to clear, on the reasoning that consume() owns clearing. It is wrong for
// the case that matters: an account on its own subdomain is armed on TWO
// origins — the main domain where the CTA was clicked, and the org host it is
// switched to after signing in. consume() runs on the org host and clears only
// that copy. Butler.logout then sets location.hostname back to the main domain,
// where the other copy is still sitting, and the NEXT sign-in replays the whole
// flow for somebody who never clicked anything.
test("the intent is cleared once the URL carries it", () => {
  const ss = store(FULL);
  const url = call(null, undefined, ss);
  assert.ok(url, "no URL was built");
  assert.equal(ss.getItem("drumee_billingDeepLink"), null,
    "the stored copy survives — it will re-fire at the next sign-in on this origin");
  assert.equal(ss.size(), 0);
});

test("a second sign-in with no new click builds nothing", () => {
  const ss = store(FULL);
  call(null, undefined, ss);                 // first login, after the CTA
  assert.equal(call(null, undefined, ss), null,
    "billing reopens on a later sign-in without anyone clicking the CTA");
});

test("the OAuth dest hands off and clears too", () => {
  // Same argument on the other path: loby parks it on oauth_state and puts it
  // back on the landing URL, so the stored copy is redundant from that moment.
  const ss = store(FULL);
  const out = new Function("localStorage", "sessionStorage",
    `${ATTR[0]}; return storedAttribution();`
  )({ getItem: () => null }, ss);
  assert.ok(out.dest, "no dest was built");
  assert.equal(ss.getItem("drumee_billingDeepLink"), null,
    "the stored copy survives an OAuth hand-off and would re-fire later");
});

test("nothing is cleared when there was nothing to hand over", () => {
  const ss = store(null);
  assert.equal(call(null, undefined, ss), null);
  assert.equal(ss.size(), 0);
});
