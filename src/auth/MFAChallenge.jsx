import React, { useState } from "react";
import {
  challengeTOTP,
  verifyTOTP,
} from "./mfa";

export default function MFAChallenge({
  factor,
  onComplete,
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (event) => {
    event.preventDefault();

    setError("");

    const cleanCode = code.replace(/\s+/g, "");

    if (!/^\d{6}$/.test(cleanCode)) {
      setError("Enter the 6-digit authenticator code.");
      return;
    }

    if (!factor?.id) {
      setError(
        "No verified authenticator factor is available."
      );
      return;
    }

    setLoading(true);

    try {
      const challenge = await challengeTOTP(
        factor.id
      );

      await verifyTOTP(
        factor.id,
        challenge.id,
        cleanCode
      );

      setCode("");

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error(
        "CargoDesk MFA challenge verification failed:",
        err
      );

      setError(
        err?.message ||
          "The authenticator code could not be verified."
      );

      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2>Verify your CargoDesk account</h2>

      <p>
        Enter the 6-digit code from your authenticator
        application to continue.
      </p>

      {error && <p>{error}</p>}

      <form onSubmit={handleVerify}>
        <label htmlFor="mfa-challenge-code">
          Authenticator code
        </label>

        <input
          id="mfa-challenge-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) =>
            setCode(
              event.target.value.replace(/\D/g, "")
            )
          }
          placeholder="000000"
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Verifying..."
            : "Verify and continue"}
        </button>
      </form>
    </section>
  );
}
