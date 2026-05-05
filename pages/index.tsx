"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Label, Input, Button } from "@roketid/windmill-react-ui";
import {
  Activity,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  CheckCircle2,
  Users,
  FileText,
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

      // Check if login was successful
      if (data.access_token && data.user) {
        // Store token and user data
        setToken(data.access_token);
        setUser(data.user);

        // Redirect to dashboard
        router.push("/ncsr/dashboard");
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err: any) {
      // Handle different error scenarios
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
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 border border-green-100 dark:border-gray-700 rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex flex-col lg:flex-row min-h-[680px]">
            {/* Left Panel - Hidden on mobile, visible on large screens */}
            <div className="hidden lg:flex lg:w-1/2 bg-green-600 text-white p-8 xl:p-12 flex-col justify-between relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_40%)]" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
              <div className="absolute top-20 left-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl" />

              {/* Header */}
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">NCSR Platform</h2>
                    <p className="text-green-100 text-sm">
                      National Cancer Screening Register
                    </p>
                  </div>
                </div>
              </div>

              {/* Main content */}
              <div className="relative z-10 space-y-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-medium rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                    <Activity className="w-4 h-4" />
                    Comprehensive Health Screening Solution
                  </div>

                  <h3 className="text-3xl font-bold mb-4 leading-tight">
                    Streamline Cancer Screening & Patient Care
                  </h3>

                  <p className="text-base leading-relaxed text-green-50">
                    A complete platform designed to help healthcare facilities
                    manage cancer screening programs efficiently and
                    effectively.
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex-shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">
                        Patient Registration
                      </h4>
                      <p className="text-sm text-green-100">
                        Register and manage patient information with
                        comprehensive risk profiling
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">
                        Screening Documentation
                      </h4>
                      <p className="text-sm text-green-100">
                        Record screening results and track patient outcomes in
                        real-time
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">
                        Referral Management
                      </h4>
                      <p className="text-sm text-green-100">
                        Seamlessly manage patient referrals and follow-up care
                        coordination
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom quote */}
              <div className="relative z-10">
                <div className="rounded-2xl bg-white/10 border border-white/20 p-5 backdrop-blur-sm">
                  <p className="text-sm text-green-50 leading-relaxed">
                    "Empowering healthcare professionals with the tools to
                    detect cancer early and save lives through organized
                    screening programs."
                  </p>
                </div>
              </div>
            </div>

            {/* Right Panel - Login Form */}
            <main className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 md:p-10 lg:p-12">
              <div className="w-full max-w-md">
                {/* Mobile header - visible only on small screens */}
                <div className="lg:hidden mb-8 text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30">
                      <ShieldCheck className="w-6 h-6 text-green-700 dark:text-green-400" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                    Cancer Screening Register
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Healthcare screening platform
                  </p>
                </div>

                {/* Logo and welcome text */}
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

                  <h1 className="text-2xl sm:text-3xl lg:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    Welcome Back
                  </h1>
                  <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    Sign in to access your screening dashboard
                  </p>
                </div>

                {/* Login form */}
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
                      className="w-full rounded-xl bg-green-600 border-green-600 hover:bg-green-700 hover:border-green-700 active:bg-green-800 disabled:bg-green-400 disabled:border-green-400 h-12 sm:h-13 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 text-base"
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

                {/* Powered by section */}
                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Powered by{" "}
                    <a
                      href="https://resilience.ng"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline transition-colors"
                    >
                      Resilience Nigeria
                    </a>
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}