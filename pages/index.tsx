"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Label, Input, Button } from "@roketid/windmill-react-ui";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  AlertCircle,
} from "lucide-react";

import api from "../lib/api";
import { setToken, setUser } from "../lib/auth";
import { LoginResponse, ErrorResponse } from "../types/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const { data } = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      if (data.access_token && data.user) {
        setToken(data.access_token);
        setUser(data.user);
        router.push("/ncsr/dashboard");
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err: any) {
      const errorData: ErrorResponse = err?.response?.data;

      if (errorData?.code === "USER_NOT_FOUND") {
        setError("No account found with this email or phone number");
      } else if (errorData?.code === "INVALID_CREDENTIALS") {
        setError("Invalid email or password");
      } else if (errorData?.code === "ACCOUNT_INACTIVE") {
        setError("Your account is inactive. Please contact administrator.");
      } else {
        setError(errorData?.message || "Unable to sign in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 border border-green-100 dark:border-gray-700 rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex flex-col lg:flex-row min-h-[680px]">

            {/* ── Left Panel: AI image only ───────────────────────── */}
            <div className="hidden lg:block lg:w-3/5 relative overflow-hidden bg-green-900">
              <Image
                src="/assets/img/cancer-screening.png"
                alt="Healthcare professionals reviewing cancer screening results"
                fill
                priority
                sizes="60vw"
                className="object-cover"
              />
            </div>

            {/* ── Right Panel: Login Form ─────────────────────────── */}
            <main className="w-full lg:w-2/5 flex items-center justify-center p-6 sm:p-8 md:p-10 lg:p-12">
              <div className="w-full max-w-md">

                {/* Mobile header */}
                <div className="lg:hidden mb-8 text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30">
                      <ShieldCheck className="w-6 h-6 text-green-700 dark:text-green-400" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                    NCSR Platform
                  </h2>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                    National Cancer Screening Register
                  </p>
                </div>

                {/* Logo + welcome */}
                <div className="mb-8 text-center lg:text-left">
                  <div className="flex justify-center lg:justify-start mb-6">
                    <Image
                      src="/assets/img/NCSR.svg"
                      alt="NCSR Logo"
                      width={300}
                      height={120}
                      className="object-contain w-auto h-auto max-w-[280px] sm:max-w-[320px]"
                      priority
                    />
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    Welcome Back
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    Sign in to access your screening dashboard
                  </p>
                </div>

                {/* Form card */}
                <div className="rounded-2xl border border-green-100 dark:border-gray-700 bg-gradient-to-br from-white to-green-50/30 dark:from-gray-900/50 dark:to-gray-800/50 backdrop-blur-sm p-6 sm:p-7 shadow-lg">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <Label>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Email or Phone Number
                      </span>
                      <div className="relative mt-2">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          className="pl-12 pr-4 py-3.5 rounded-xl border-gray-200 dark:border-gray-600 focus:border-green-500 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm transition-colors"
                          type="text"
                          placeholder="john@example.com or phone number"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoComplete="email"
                        />
                      </div>
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Password
                      </span>
                      <div className="relative mt-2">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          className="pl-12 pr-14 py-3.5 rounded-xl border-gray-200 dark:border-gray-600 focus:border-green-500 focus:ring-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm transition-colors"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-gray-700 transition-colors"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </Label>

                    {error ? (
                      <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 animate-in fade-in slide-in-from-top-1 duration-300">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {error}
                        </p>
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      className="w-full rounded-xl bg-green-600 border-green-600 hover:bg-green-700 hover:border-green-700 active:bg-green-800 disabled:bg-green-400 disabled:border-green-400 h-12 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 text-base"
                      disabled={submitting}
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        {submitting && (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        )}
                        {submitting ? "Signing in..." : "Sign In"}
                      </span>
                    </Button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      href="/forgot-password"
                      className="block text-center lg:text-left text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline transition-colors"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                {/* Powered by — logo only */}
                <div className="mt-8 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-medium">
                    Powered by
                  </span>
                  <a
                    href="https://resilience.ng"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="Resilience Nigeria"
                  >
                    <Image
                      src="/assets/img/resilience.png"
                      alt="Resilience Nigeria"
                      width={220}
                      height={52}
                      className="object-contain h-12 w-auto"
                    />
                  </a>
                </div>

              </div>
            </main>
          </div>
        </div>

        {/* Bottom caption — page level */}
        <p className="mt-6 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Early detection saves lives — organized screening, better outcomes.
        </p>
      </div>
    </div>
  );
}