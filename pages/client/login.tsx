"use client";
import React, { useState } from "react";
import { useRouter } from "next/router";
import { Button, Input, Label } from "@roketid/windmill-react-ui";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <img
              src="/nicrat-logo.png"
              alt="NICRAT"
              className="w-10 h-10 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">My NCSR Record</h1>
          <p className="mt-2 text-sm text-gray-500">
            {stage === "phone"
              ? "Enter your phone number to view your screening record."
              : `Enter the code sent to ${maskedPhone || "your phone"}.`}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 space-y-5">
          {stage === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <Label>
                <span className="text-sm font-semibold">Phone Number</span>
                <Input
                  type="tel"
                  className="mt-2 rounded-2xl h-12"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="080xxxxxxxx"
                />
              </Label>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800 text-base font-semibold"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending code...
                  </span>
                ) : (
                  "Send Login Code"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <button
                type="button"
                onClick={() => { setStage("phone"); setOtp(""); setError(""); }}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Use a different number
              </button>
              <Label>
                <span className="text-sm font-semibold">6-Digit Code</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="mt-2 rounded-2xl h-12 text-center text-lg tracking-widest"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                />
              </Label>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800 text-base font-semibold"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Log In
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          This shows only your own screening information — kept private and confidential.
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        Platform powered by Resilience Nigeria
      </p>
    </div>
  );
}
