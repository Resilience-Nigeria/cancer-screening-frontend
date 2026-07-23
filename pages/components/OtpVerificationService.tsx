// components/OtpVerificationStep.tsx
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { Loader2, ShieldCheck, RefreshCw, CheckCircle, Mail, MessageCircle, Smartphone } from "lucide-react";
import api from "@/lib/api";

type Props = {
  phoneNumber: string;
  maskedPhone: string;
  registrationId: string;
  email?: string;       
  name?: string; 
  onVerified: (facility: any) => void;
};

export default function OtpVerificationStep({
  phoneNumber,
  maskedPhone,
  registrationId,
  onVerified,
  email,
  name,
}: Props) {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function handleOtpChange(index: number, value: string) {
    // Only allow digits
    const digit = value.replace(/\D/, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError("");

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5 && newOtp.every((d) => d !== "")) {
      handleVerify(newOtp.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  }

  async function handleVerify(code: string) {
    if (code.length !== 6) return;
    setVerifying(true);
    setError("");

    try {
      const { data } = await api.post("/otp/verify", {
        phoneNumber,
        otp: code,
      });
      onVerified(data.facility ?? null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Verification failed. Please try again.");
      // Clear OTP inputs on error
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError("");
    try {
      await api.post("/otp/resend", {
        phoneNumber,
        registrationId,
        email: email ?? null,
        name: name ?? null,
      });
      setCountdown(60);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Could not resend OTP.");
    } finally {
      setResending(false);
    }
  }

  // Determine which channels are available
  const hasEmail = !!email;
  const hasWhatsApp = true; // Assuming WhatsApp is always available
  const hasSMS = true; // Assuming SMS is always available

  const channels = [];
  if (hasEmail) channels.push({ icon: Mail, label: "Email" });
  if (hasWhatsApp) channels.push({ icon: MessageCircle, label: "WhatsApp" });
  if (hasSMS) channels.push({ icon: Smartphone, label: "SMS" });

  // Format the delivery channels message
  const channelList = channels.map(c => c.label).join(", ");
  const lastChannel = channels.length > 1 ? channels[channels.length - 1].label : "";
  const channelMessage = channels.length > 1 
    ? `${channels.slice(0, -1).map(c => c.label).join(", ")} or ${lastChannel}`
    : channelList;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">

        {/* Icon + heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <ShieldCheck className="w-8 h-8 text-green-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify your number</h1>
          <p className="mt-2 text-sm text-gray-500">
            We sent a 6-digit verification code via
          </p>
          <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
            {channels.map((channel, index) => (
              <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                <channel.icon className="w-3.5 h-3.5" />
                {channel.label}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-500">
            to {email ? `your email (${email}) and phone` : 'your phone'}
          </p>
          <p className="mt-1 font-semibold text-gray-800 text-base">
            {email ? `${email} • ${maskedPhone}` : maskedPhone}
          </p>
        </div>

        {/* OTP Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 space-y-6">

          {/* 6 digit inputs */}
          <div
            className="flex justify-center gap-3"
            onPaste={handlePaste}
          >
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={verifying}
                className={`
                  w-12 h-14 text-center text-xl font-bold rounded-2xl border-2 
                  outline-none transition-all
                  ${digit
                    ? "border-green-500 bg-green-50 text-green-800"
                    : "border-gray-200 bg-gray-50 text-gray-800"
                  }
                  ${error ? "border-red-400 bg-red-50" : ""}
                  focus:border-green-600 focus:bg-white
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              />
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Verify button */}
          <Button
            onClick={() => handleVerify(otp.join(""))}
            disabled={verifying || otp.some((d) => !d)}
            className="w-full h-12 rounded-2xl bg-green-700 border-green-700 
                       hover:bg-green-800 text-base font-semibold"
          >
            {verifying ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Verify Code
              </span>
            )}
          </Button>

          {/* Resend */}
          <div className="text-center">
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-2 text-sm font-semibold 
                           text-green-700 hover:text-green-800 disabled:opacity-50"
              >
                {resending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                  : <><RefreshCw className="w-3.5 h-3.5" /> Resend code</>
                }
              </button>
            ) : (
              <p className="text-sm text-gray-400">
                Resend code in{" "}
                <span className="font-semibold text-gray-600">{countdown}s</span>
              </p>
            )}
          </div>

          {/* Updated help text */}
          <div className="space-y-2">
            <p className="text-center text-xs text-gray-400">
              Didn't get the code? Check your {channelMessage} messages.
              Make sure your contact details are correct.
            </p>
            {hasEmail && (
              <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                <Mail className="w-3 h-3" />
                <span>Check your email spam folder if you don't see it in your inbox</span>
              </div>
            )}
          </div>

          {/* Channel icons for visual reference */}
          <div className="flex justify-center gap-4 pt-2 border-t border-gray-100">
            {hasWhatsApp && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MessageCircle className="w-4 h-4 text-green-600" />
                <span>WhatsApp</span>
              </div>
            )}
            {hasSMS && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Smartphone className="w-4 h-4 text-blue-500" />
                <span>SMS</span>
              </div>
            )}
            {hasEmail && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Mail className="w-4 h-4 text-red-500" />
                <span>Email</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}