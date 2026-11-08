// Server-side check of a Cloudflare Turnstile token: the proof that the connection comes from a real
// browser that passed the challenge. Tokens are good for 5 minutes and can be checked once.
//
// It fails closed: if the token is missing, wrong, already used, or Cloudflare's check cannot be
// reached, the connection is refused.
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048; // from the Turnstile docs
const TIMEOUT_MS = 5000;

// Returns { success, errors }. `errors` are Turnstile's codes, plus "network-error" and "bad-response"
// for problems on our side of the call.
export async function verifyTurnstile({ token, secret, ip, fetchImpl = fetch }) {
  if (!token || token.length > MAX_TOKEN_LENGTH) return { success: false, errors: ["missing-input-response"] };

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip && ip !== "unknown") body.append("remoteip", ip);

  try {
    const response = await fetchImpl(SITEVERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const result = await response.json();
    if (typeof result?.success !== "boolean") return { success: false, errors: ["bad-response"] };
    return { success: result.success, errors: result["error-codes"] ?? [] };
  } catch {
    return { success: false, errors: ["network-error"] };
  }
}
