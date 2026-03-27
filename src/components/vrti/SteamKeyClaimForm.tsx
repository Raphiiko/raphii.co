import { useState } from "react";

type ProofMethod = "email" | "orderId";

type ClaimSuccessResponse = {
  steamKey: string;
  claimedAt: number;
  alreadyClaimed: boolean;
};

type ClaimErrorResponse = {
  error?: string;
  message?: string;
};

type ClaimErrorContext = {
  status: number;
  payload: ClaimErrorResponse | null;
};

const CLAIM_ENDPOINT = "https://api.raphii.co/vrti/steam/claim";
const LICENSE_KEY_PATTERN =
  /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

async function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard unavailable");
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "absolute";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}

function formatClaimedAt(timestamp: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp * 1000));
  } catch {
    return new Date(timestamp * 1000).toLocaleString();
  }
}

function getErrorMessage({ status, payload }: ClaimErrorContext, fallback: string) {
  const error = payload?.error?.trim();
  const message = payload?.message?.trim();

  if (status === 400 && message) {
    return message;
  }

  if (status === 401) {
    return "That VRTI license key is invalid or inactive.";
  }

  if (status === 403) {
    return "The purchase email address or order ID does not match this license key.";
  }

  if (status === 409) {
    return "No Steam keys are available right now. Please try again later or contact support.";
  }

  if (status === 503) {
    if (error === "Steam key claim service not initialized") {
      return "The Steam key claim service is not fully set up yet. Please try again later.";
    }

    if (error === "Purchase validation service unavailable") {
      return "The license key could not be validated right now. Double-check it and try again. If the key is correct, please try again in a few minutes.";
    }

    return "The claim service is temporarily unavailable. Please try again in a few minutes.";
  }

  if (status >= 500) {
    return "The claim failed due to a server error. Please try again later.";
  }

  return message || error || fallback;
}

export default function SteamKeyClaimForm() {
  const [licenseKey, setLicenseKey] = useState("");
  const [proofMethod, setProofMethod] = useState<ProofMethod>("email");
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimSuccessResponse | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const activeProofValue = proofMethod === "email" ? email : orderId;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedLicenseKey = licenseKey.trim();
    const normalizedEmail = email.trim();
    const normalizedOrderId = orderId.trim();

    if (!normalizedLicenseKey) {
      setErrorMessage("Enter the VRTI license key from your original purchase.");
      setResult(null);
      return;
    }

    if (!LICENSE_KEY_PATTERN.test(normalizedLicenseKey)) {
      setErrorMessage(
        "Enter the full VRTI license key exactly as it appears in your LemonSqueezy receipt.",
      );
      setResult(null);
      return;
    }

    if (proofMethod === "email" && !normalizedEmail) {
      setErrorMessage("Enter the email address used for the LemonSqueezy purchase.");
      setResult(null);
      return;
    }

    if (proofMethod === "orderId" && !normalizedOrderId) {
      setErrorMessage("Enter the numeric LemonSqueezy order ID.");
      setResult(null);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setResult(null);
    setCopyState("idle");

    try {
      const response = await fetch(CLAIM_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          licenseKey: normalizedLicenseKey,
          ...(proofMethod === "email"
            ? { email: normalizedEmail }
            : { orderId: normalizedOrderId }),
        }),
      });

      const responseText = await response.text();
      const payload = responseText
        ? (JSON.parse(responseText) as ClaimSuccessResponse | ClaimErrorResponse)
        : null;

      if (!response.ok) {
        setErrorMessage(
          getErrorMessage(
            {
              status: response.status,
              payload: payload as ClaimErrorResponse | null,
            },
            "The Steam key could not be claimed.",
          ),
        );
        return;
      }

      setResult(payload as ClaimSuccessResponse);
    } catch {
      setErrorMessage(
        "The Steam key claim service could not be reached. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!result) {
      return;
    }

    try {
      await copyText(result.steamKey);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="steam-claim-root">
      <style>{`
        .steam-claim-root {
          margin: 1.5rem 0;
        }

        .steam-claim-card,
        .steam-claim-panel {
          border: 1px solid var(--sl-color-gray-5);
          background: rgba(255, 255, 255, 0.02);
          border-radius: 0.625rem;
          padding: 1.25rem;
        }

        .steam-claim-help,
        .steam-claim-field-hint,
        .steam-claim-meta {
          margin: 0;
          color: var(--sl-color-gray-2);
        }

        .steam-claim-form {
          display: grid;
          gap: 1.25rem;
        }

        .steam-claim-field {
          display: grid;
          gap: 0.5rem;
        }

        .steam-claim-field label,
        .steam-claim-proof legend {
          font-weight: 600;
          color: var(--sl-color-white);
        }

        .steam-claim-input {
          width: 100%;
          border: 1px solid var(--sl-color-gray-5);
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.04);
          color: var(--sl-color-white);
          padding: 0.8rem 0.95rem;
          font: inherit;
          transition: border-color 0.15s ease, background-color 0.15s ease;
        }

        .steam-claim-input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.05);
        }

        .steam-claim-input::placeholder {
          color: var(--sl-color-gray-3);
        }

        .steam-claim-proof {
          border: 0;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 0.5rem;
        }

        .steam-claim-proof-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.5rem;
          align-items: stretch;
        }

        .steam-claim-proof-options > * {
          margin-top: 0 !important;
        }

        .steam-claim-proof-toggle {
          appearance: none;
          -webkit-appearance: none;
          display: flex;
          flex: 1 1 auto;
          align-items: center;
          justify-content: center;
          height: 2.75rem;
          width: 100%;
          margin: 0;
          text-align: center;
          border-radius: 0.5rem;
          border: 1px solid var(--sl-color-gray-5);
          background: transparent;
          color: var(--sl-color-white);
          font-weight: 600;
          line-height: 1;
          padding: 0 1rem;
          cursor: pointer;
          font: inherit;
          box-sizing: border-box;
          vertical-align: top;
          transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
        }

        .steam-claim-proof-toggle[data-active="true"] {
          border-color: rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.08);
          color: var(--sl-color-white);
        }

        .steam-claim-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }

        .steam-claim-submit,
        .steam-claim-copy {
          border: 1px solid var(--sl-color-gray-5);
          border-radius: 0.5rem;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
        }

        .steam-claim-submit {
          background: var(--sl-color-white);
          color: var(--sl-color-black);
          min-height: 2.75rem;
          padding: 0.75rem 1rem;
          min-width: 11rem;
          border-color: transparent;
        }

        .steam-claim-submit:hover,
        .steam-claim-copy:hover {
          border-color: rgba(255, 255, 255, 0.28);
        }

        .steam-claim-submit:disabled,
        .steam-claim-copy:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .steam-claim-panel {
          margin-top: 1rem;
          display: grid;
          gap: 0.75rem;
        }

        .steam-claim-panel[data-tone="error"] {
          border-color: rgba(248, 113, 113, 0.4);
          background: rgba(127, 29, 29, 0.16);
        }

        .steam-claim-panel[data-tone="success"] {
          border-color: rgba(74, 222, 128, 0.35);
          background: rgba(20, 83, 45, 0.16);
        }

        .steam-claim-panel h3 {
          margin: 0;
          font-size: 1.05rem;
        }

        .steam-claim-success-intro {
          margin: 0;
          color: var(--sl-color-gray-2);
        }

        .steam-claim-key-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }

        .steam-claim-key {
          flex: 1 1 15rem;
          min-width: 0;
          min-height: 2.75rem;
          display: flex;
          align-items: center;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          padding: 0.75rem 0.9rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.96);
          overflow-wrap: anywhere;
          box-sizing: border-box;
        }

        .steam-claim-copy {
          min-height: 2.75rem;
          min-width: 8rem;
          background: rgba(255, 255, 255, 0.1);
          color: var(--sl-color-white);
          padding: 0.75rem 1rem;
          white-space: nowrap;
        }

        .steam-claim-copy[data-copy-state="copied"] {
          background: rgba(74, 222, 128, 0.22);
          color: rgb(220, 252, 231);
        }

        .steam-claim-copy[data-copy-state="failed"] {
          background: rgba(248, 113, 113, 0.18);
          color: rgb(254, 226, 226);
        }

        .steam-claim-success-notes {
          display: grid;
          gap: 0.35rem;
        }

        .steam-claim-meta-strong {
          color: var(--sl-color-white);
          font-weight: 600;
        }

        @media (max-width: 40rem) {
          .steam-claim-card,
          .steam-claim-panel {
            padding: 1rem;
            border-radius: 0.5rem;
          }

          .steam-claim-proof-options {
            grid-template-columns: 1fr;
          }

          .steam-claim-submit,
          .steam-claim-copy {
            width: 100%;
          }
        }
      `}</style>

      <section className="steam-claim-card">
        <form className="steam-claim-form" onSubmit={handleSubmit}>
          <div className="steam-claim-field">
            <label htmlFor="steam-claim-license-key">License key</label>
            <input
              id="steam-claim-license-key"
              className="steam-claim-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="38b1460a-5104-4067-a91d-77b872934d51"
              value={licenseKey}
              disabled={submitting}
              onChange={(event) => setLicenseKey(event.target.value)}
            />
            <p className="steam-claim-field-hint">
              This should be the VRTI license key that was issued with your
              original purchase.
            </p>
          </div>

          <fieldset className="steam-claim-proof">
            <legend>Purchase verification</legend>
            <p className="steam-claim-field-hint">
              Use either your purchase email address or the numeric LemonSqueezy
              order ID.
            </p>
            <div className="steam-claim-proof-options">
              <button
                className="steam-claim-proof-toggle"
                data-active={proofMethod === "email"}
                type="button"
                aria-pressed={proofMethod === "email"}
                disabled={submitting}
                onClick={() => {
                  setProofMethod("email");
                  setErrorMessage(null);
                }}
              >
                Email address
              </button>

              <button
                className="steam-claim-proof-toggle"
                data-active={proofMethod === "orderId"}
                type="button"
                aria-pressed={proofMethod === "orderId"}
                disabled={submitting}
                onClick={() => {
                  setProofMethod("orderId");
                  setErrorMessage(null);
                }}
              >
                Order ID
              </button>
            </div>
          </fieldset>

          <div className="steam-claim-field">
            <label htmlFor="steam-claim-proof-value">
              {proofMethod === "email"
                ? "Purchase email address"
                : "LemonSqueezy order ID"}
            </label>
            <input
              id="steam-claim-proof-value"
              className="steam-claim-input"
              type={proofMethod === "email" ? "email" : "text"}
              autoComplete={proofMethod === "email" ? "email" : "off"}
              inputMode={proofMethod === "email" ? "email" : "numeric"}
              placeholder={
                proofMethod === "email" ? "name@example.com" : "123456"
              }
              value={activeProofValue}
              disabled={submitting}
              onChange={(event) => {
                const nextValue =
                  proofMethod === "email"
                    ? event.target.value
                    : event.target.value.replace(/\D+/g, "");

                if (proofMethod === "email") {
                  setEmail(nextValue);
                } else {
                  setOrderId(nextValue);
                }
              }}
            />
            <p className="steam-claim-field-hint">
              {proofMethod === "email"
                ? "Use the same email address that was used during checkout."
                : "Use the numeric LemonSqueezy order number from your receipt."}
            </p>
          </div>

          <div className="steam-claim-actions">
            <button
              className="steam-claim-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Checking purchase..." : "Get Steam key"}
            </button>
          </div>
        </form>
      </section>

      {errorMessage && (
        <section
          className="steam-claim-panel"
          data-tone="error"
          role="alert"
          aria-live="polite"
        >
          <h3>Claim failed</h3>
          <p>{errorMessage}</p>
        </section>
      )}

      {result && (
        <section
          className="steam-claim-panel"
          data-tone="success"
          role="status"
          aria-live="polite"
        >
          <h3>{result.alreadyClaimed ? "Your Steam key" : "Your Steam key is ready"}</h3>
          <p className="steam-claim-success-intro">
            Redeem this key in Steam and keep it private.
          </p>

          <div className="steam-claim-key-row">
            <code className="steam-claim-key">{result.steamKey}</code>
            <button
              className="steam-claim-copy"
              data-copy-state={copyState}
              type="button"
              onClick={handleCopy}
            >
              {copyState === "copied"
                ? "Copied"
                : copyState === "failed"
                  ? "Copy failed"
                  : "Copy key"}
            </button>
          </div>

          <div className="steam-claim-success-notes">
            <p className="steam-claim-meta">
              <span className="steam-claim-meta-strong">
                {result.alreadyClaimed ? "Originally claimed" : "Claimed"}
              </span>{" "}
              on {formatClaimedAt(result.claimedAt)}.
            </p>
            <p className="steam-claim-meta">
              While you can already activate your Steam key, the application
              will not be downloadable from Steam until the official release.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
