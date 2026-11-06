// One warm-up screen per sign-in.
//
// Stage log 2026-11-06 10:14, account on its own org host (yipejo5194.drumee.in)
// signing in at drumee.in:
//
//   10:14:04.971  yp.signin                       (drumee.in)
//   10:14:11.525  yp.get_env  hub=cd1cbbc8… MAIN   ← "ok" → location.reload() ON drumee.in   (warm-up #1)
//   10:14:17.098  yp.get_env  hub=09cd657c… ORG    ← router.changeHost to the org host        (warm-up #2)
//
// The login answer already names the account's organisation, so the post-login
// navigation now goes STRAIGHT to the org host when it is not this one — one
// cross-origin load, one warm-up — through ui-team's uiRouter.changeHost (which
// carries a link armed while signed out and a signup offer). The billing
// destination is put on the URL first, exactly as before.
//
// Run: node --test tests/one-warmup-per-signin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const SRC = readFileSync(join(__dirname, "../src/widgets/form/index.js"), "utf8");

// The real helper module, with the browser globals it reads injected.
const MOD = join(__dirname, "../src/widgets/org-host-handoff.js");
function loadHelper() {
  return (env) => {
    global.location = env.location;
    global.history = env.history;
    global.uiRouter = env.uiRouter;
    if (env.uiRouter === undefined) delete global.uiRouter;
    delete require.cache[require.resolve(MOD)];
    return require(MOD).orgHostHandoff;
  };
}

function env(host, changeHostResult = true) {
  const calls = [];
  return {
    calls,
    location: { host, hostname: host, href: `https://${host}/-/huan/#/welcome/signin` },
    history: { replaceState(s, t, url) { calls.push(["replaceState", url]); } },
    uiRouter: { changeHost(h) { calls.push(["changeHost", h]); return changeHostResult; } },
  };
}

test("org on another host: one hand-off through changeHost, no reload", () => {
  const e = env("drumee.in");
  const fn = loadHelper()(e);
  assert.equal(fn({ link: "yipejo5194.drumee.in" }, null), true);
  assert.deepEqual(e.calls, [["changeHost", "yipejo5194.drumee.in"]]);
});

test("billing destination rides on the URL before the hand-off", () => {
  const e = env("drumee.in");
  const fn = loadHelper()(e);
  const back = "https://drumee.in/-/huan/#/welcome/signin?billing=1&plan=team";
  assert.equal(fn({ link: "team-1.drumee.in" }, back), true);
  assert.deepEqual(e.calls, [["replaceState", back], ["changeHost", "team-1.drumee.in"]]);
});

test("org on THIS host, no org, or a refused switch: caller reloads", () => {
  const same = env("yipejo5194.drumee.in");
  assert.equal(loadHelper()(same)({ link: "yipejo5194.drumee.in" }, null), false);
  assert.deepEqual(same.calls, []);
  const none = env("drumee.in");
  assert.equal(loadHelper()(none)(null, null), false);
  assert.equal(loadHelper()(none)({}, null), false);
  const refused = env("drumee.in", false);
  assert.equal(loadHelper()(refused)({ link: "x.drumee.in" }, null), false);
});

test("no uiRouter (older host app): caller reloads as before", () => {
  const e = env("drumee.in");
  e.uiRouter = undefined;
  assert.equal(loadHelper()(e)({ link: "x.drumee.in" }, null), false);
});

test("the ok branch and gotSignedIn both try the hand-off before reloading", () => {
  const ok = SRC.slice(SRC.indexOf('case "ok":'), SRC.indexOf('case "ALREADY_SIGNED_IN":'));
  const hand = ok.indexOf("orgHostHandoff(");
  const reload = ok.indexOf("location.reload()");
  assert.ok(hand > 0 && hand < reload, "ok: hand-off first, reload only as fallback");

  const g = SRC.slice(SRC.indexOf("  gotSignedIn(data) {"), SRC.indexOf("  onDomRefresh() {"));
  const gh = g.indexOf("orgHostHandoff(");
  const gs = g.indexOf("Drumee.start();");
  assert.ok(gh > 0 && gh < gs, "form gotSignedIn: hand-off before Drumee.start");

  const R = readFileSync(join(__dirname, "../src/widgets/router/index.js"), "utf8");
  const rg = R.slice(R.indexOf("  gotSignedIn(data) {"));
  const rh = rg.indexOf("orgHostHandoff(");
  const rs = rg.indexOf("Drumee.start();");
  assert.ok(rh > 0 && rh < rs, "router gotSignedIn (OTP/2FA): hand-off before Drumee.start");
});
