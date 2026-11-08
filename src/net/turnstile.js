// The browser side of Cloudflare Turnstile: a challenge that only a real browser can pass, so scripts
// cannot open rooms. The widget is invisible; if Cloudflare is not sure the visitor is a person it
// shows a small checkbox in the middle of the screen.
//
// getTurnstileToken(siteKey) resolves with a token that the relay checks (it is good for 5 minutes and
// can be used once, so a new one is asked for on every connection). It rejects with an Error whose
// message is "challenge-unavailable" (the script did not load, for example an ad blocker) or
// "challenge-failed" (the challenge failed or took too long).
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_TIMEOUT_MS = 10_000;
const CHALLENGE_TIMEOUT_MS = 45_000;

let scriptPromise = null;

// Loads Cloudflare's script (it must come from that exact address, never from our own server).
function loadTurnstileScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    const timer = setTimeout(() => fail(), SCRIPT_TIMEOUT_MS);
    const fail = () => {
      clearTimeout(timer);
      scriptPromise = null; // allow another try later
      script.remove();
      reject(new Error("challenge-unavailable"));
    };
    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export async function getTurnstileToken(siteKey) {
  await loadTurnstileScript();

  const container = document.createElement("div");
  container.id = "turnstile-box";
  // Out of the way until an interactive challenge is needed, then centred over the game.
  Object.assign(container.style, { position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", zIndex: "9999" });
  document.body.appendChild(container);

  return new Promise((resolve, reject) => {
    const widget = { id: undefined }; // set once the widget exists (a callback could in theory run before)
    const finish = (done) => {
      clearTimeout(timer);
      if (widget.id !== undefined) window.turnstile.remove(widget.id);
      container.remove();
      done();
    };
    const timer = setTimeout(() => finish(() => reject(new Error("challenge-failed"))), CHALLENGE_TIMEOUT_MS);

    widget.id = window.turnstile.render(container, {
      sitekey: siteKey,
      appearance: "interaction-only",
      callback: (token) => finish(() => resolve(token)),
      "error-callback": () => finish(() => reject(new Error("challenge-failed")))
    });
  });
}
