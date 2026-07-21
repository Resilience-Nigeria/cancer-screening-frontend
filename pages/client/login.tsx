"use client";
import React, { useState } from "react";
import { useRouter } from "next/router";
import { Loader2, ShieldCheck, ArrowLeft, Lock, MessageSquareText } from "lucide-react";
import toast from "react-hot-toast";
import clientPortalApi from "../../lib/clientPortalApi";

export default function ClientLoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const { data } = await clientPortalApi.post("/client-portal/send-otp", { phoneNumber });
      setMaskedPhone(data.maskedPhone || "");
      setStage("otp");
      toast.success("If that number is registered, a login code has been sent.");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const { data } = await clientPortalApi.post("/client-portal/verify-otp", { phoneNumber, otp });
      localStorage.setItem("clientPortalToken", data.token);
      localStorage.setItem("clientPortalName", data.client?.fullName || "");
      toast.success("Welcome back!");
      router.push("/client/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Incorrect or expired code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-green-600 to-emerald-600 shadow-lg shadow-green-200 mb-5">
              <img
                src="/nicrat-logo.png"
                alt="NICRAT"
                className="w-11 h-11 object-contain brightness-0 invert"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">My NCSR Record</h1>
            <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
              {stage === "phone"
                ? "Securely view your screening history, results, and next steps — anytime."
                : `We texted a 6-digit code to ${maskedPhone || "your phone"}.`}
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-7">
            {stage === "phone" ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    className="mt-2 w-full h-13 px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all text-base"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="080xxxxxxxx"
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-gray-400">
                    Use the phone number on file with your screening facility.
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-13 py-3.5 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-base font-semibold shadow-lg shadow-green-200 transition-all disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending code...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 justify-center">
                      <MessageSquareText className="w-4 h-4" /> Send Login Code
                    </span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <button
                  type="button"
                  onClick={() => { setStage("phone"); setOtp(""); setError(""); }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Use a different number
                </button>

                <div>
                  <label className="text-sm font-semibold text-gray-700">6-Digit Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    className="mt-2 w-full h-14 px-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all text-center text-2xl font-bold tracking-[0.5em]"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="······"
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-13 py-3.5 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-base font-semibold shadow-lg shadow-green-200 transition-all disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 justify-center">
                      <ShieldCheck className="w-4 h-4" /> Log In
                    </span>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Lock className="w-3.5 h-3.5" />
            Private and confidential — only you can see your own record
          </div>
        </div>
      </div>

      <p className="pb-6 text-center text-xs text-gray-400">
        Platform powered by Resilience Nigeria
      </p>
    </div>
  );
}
