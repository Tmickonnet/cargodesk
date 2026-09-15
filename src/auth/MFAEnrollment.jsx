import React, { useState } from "react";
import {
  enrollTOTP,
  challengeTOTP,
  verifyTOTP,
} from "./mfa";

export default function MFAEnrollment({ onComplete }) {
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEnroll = async () => {
    setError("");
    setLoading(true);

    try {
      const data = await enrollTOTP();
      setEnrollment(data);
    } catch (err) {
      console.error("CargoDesk MFA enrollment failed:", err);
      setError(
        err?.message ||
          "Unable to start MFA enrollment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    setError("");

    const cleanCode = code.replace(/\s+/g, "");

    if (!/^\d{6}$/.test(cleanCode)) {
      setError("Enter the 6-digit authenticator code.");
      return;
    }

    setLoading(true);

    try {
      const challenge = await challengeTOTP(
        enrollment.id
      );

      await verifyTOTP(challenge.id, cleanCode);

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error("CargoDesk MFA verification failed:", err);
      setError(
        err?.message ||
          "The authenticator code could not be verified."
      );
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  if (!enrollment) {
    return (
      <section>
        <h2>Secure your CargoDesk account</h2>

        <p>
          Multi-factor authentication is required for
          this administrator account.
        </p>

        <p>
          You will use an authenticator app to generate
          a temporary security code.
        </p>

        {error && <p>{error}</p>}

        <button
          type="button"
          onClick={handleEnroll}
          disabled={loading}
        >
          {loading
            ? "Preparing MFA..."
            : "Set up authenticator"}
        </button>
      </section>
    );
  }

  return (
    <section>
      <h2>Verify your authenticator</h2>

      <p>
        Scan the QR code below with your authenticator
        application.
      </p>

      {enrollment.totp?.secret && (
  <div>
    <p>
      If you cannot scan the QR code, enter this setup
      key manually in your authenticator app:
    </p>

    <p>
      <strong>{enrollment.totp.secret}</strong>
    </p>
  </div>
)}

      <form onSubmit={handleVerify}>
        <label htmlFor="mfa-code">
          Authenticator code
        </label>

        <input
          id="mfa-code"
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

        {error && <p>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Verify MFA"}
        </button>
      </form>
    </section>
  );
}
