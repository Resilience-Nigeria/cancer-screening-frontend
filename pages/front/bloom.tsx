"use client";
import React, { useEffect, useState } from "react";
import { Button, Input, Label, Select } from "@roketid/windmill-react-ui";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { nigerianStates, lgasByState, getStateCode } from "../../lib/nigerianstates";
import api from "@/lib/api";
import OtpVerificationStep from "../components/OtpVerificationService";
import SelfAssessmentForm, { AssessmentResult } from "../components/SelfAssessmentForm";

const RISK_STYLES: Record<AssessmentResult["riskCategory"], { label: string; badge: string; icon: React.ReactNode }> = {
  low: {
    label: "Low Risk",
    badge: "bg-green-100 text-green-800",
    icon: <CheckCircle className="w-5 h-5" />,
  },
  average: {
    label: "Average Risk",
    badge: "bg-blue-100 text-blue-800",
    icon: <CheckCircle className="w-5 h-5" />,
  },
  increased: {
    label: "Increased Risk",
    badge: "bg-amber-100 text-amber-800",
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  symptomatic_high: {
    label: "Needs Prompt Evaluation",
    badge: "bg-red-100 text-red-800",
    icon: <AlertTriangle className="w-5 h-5" />,
  },
};

function ResultsScreen({ name, result }: { name: string; result: AssessmentResult }) {
  const style = RISK_STYLES[result.riskCategory];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 flex-1 flex flex-col justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Thank you{name ? `, ${name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-2 text-sm text-gray-500">Here's what your assessment found.</p>
          <p className="mt-1 text-xs text-gray-400">Reference: SA-{result.assessmentId}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 space-y-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${style.badge}`}>
            {style.icon}
            {style.label}
          </div>

          <p className="text-sm text-gray-700 leading-6">{result.recommendation}</p>

          {result.flaggedReasons.length > 0 && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Based on
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                {result.flaggedReasons.map((r, i) => (
                  <li key={i} className="capitalize">{r}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-400 italic">
            This is a decision-support tool, not a diagnosis. Please discuss these results with a healthcare provider.
          </p>
        </div>

        {result.facility ? (
          <div className="rounded-2xl bg-white border border-green-100 shadow-md p-5 text-left space-y-3">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Your Screening Centre
            </p>
            <p className="text-lg font-bold text-gray-900">{result.facility.facilityName}</p>
            {result.facility.facilityAddress && (
              <p className="text-sm text-gray-500">{result.facility.facilityAddress}</p>
            )}
            {result.facility.navigatorName && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Your Contact Person</p>
                <p className="font-semibold text-gray-800">{result.facility.navigatorName}</p>
                {result.facility.navigatorPhone && (
                  <a
                    href={`tel:${result.facility.navigatorPhone}`}
                    className="inline-flex items-center gap-1.5 mt-1 text-green-700 font-medium text-sm hover:underline"
                  >
                    {result.facility.navigatorPhone}
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
            <p className="text-sm text-amber-700">
              Our team will reach out to you shortly with your nearest screening centre.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Please attend your screening as soon as possible. Early detection saves lives.
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        Platform powered by Resilience Nigeria
      </p>
    </div>
  );
}

export default function BloomPage() {
  const [form, setForm] = useState({
    fullName: "",
    gender: "",
    phoneNumber: "",
    email: "",
    stateOfResidence: "",
    lgaOfResidence: "",
    areaOfResidence: "",
    campaignSource:
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("src") ?? "bloom"
        : "bloom",
  });

  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<"form" | "otp" | "assessment" | "results">("form");
  const [registrationId, setRegistrationId] = useState<string>("");
  const [maskedPhone, setMaskedPhone] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  function setField(name: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "stateOfResidence") next.lgaOfResidence = "";
      return next;
    });
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required.";
    if (!form.gender) e.gender = "Please select your gender.";
    if (!form.phoneNumber.trim()) e.phoneNumber = "Phone number is required.";
    if (!form.stateOfResidence) e.stateOfResidence = "Please select your state.";
    if (!form.lgaOfResidence) e.lgaOfResidence = "Please select your LGA.";
    return e;
  }

  useEffect(() => {
    if (!form.stateOfResidence || !form.lgaOfResidence) {
      setAvailableAreas([]);
      setForm((prev) => ({ ...prev, areaOfResidence: "" }));
      return;
    }
    (async () => {
      try {
        const { data } = await api.get("/areas", {
          params: { state: form.stateOfResidence, lga: form.lgaOfResidence },
        });
        setAvailableAreas(data?.areas ?? []);
        setForm((prev) => ({ ...prev, areaOfResidence: "" }));
      } catch {
        setAvailableAreas([]);
      }
    })();
  }, [form.stateOfResidence, form.lgaOfResidence]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/awareness/register", form);
      setRegistrationId(String(data.registrationId));
      setMaskedPhone(data.maskedPhone);
      setStage("otp");
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const mapped: Record<string, string> = {};
      Object.keys(apiErrors).forEach((k) => {
        mapped[k] = Array.isArray(apiErrors[k]) ? apiErrors[k][0] : apiErrors[k];
      });
      setErrors(
        Object.keys(mapped).length
          ? mapped
          : { fullName: err?.response?.data?.message ?? "Something went wrong." }
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Stage gates ──────────────────────────────────────────────────────────
  if (stage === "otp") {
    return (
      <OtpVerificationStep
        phoneNumber={form.phoneNumber}
        maskedPhone={maskedPhone}
        registrationId={registrationId}
        email={form.email || undefined}
        name={form.fullName || undefined}
        onVerified={() => setStage("assessment")}
      />
    );
  }

  if (stage === "assessment") {
    return (
      <SelfAssessmentForm
        registrationId={registrationId}
        gender={(form.gender as "male" | "female") || "female"}
        onComplete={(result) => {
          setAssessmentResult(result);
          setStage("results");
        }}
      />
    );
  }

  if (stage === "results" && assessmentResult) {
    return <ResultsScreen name={form.fullName} result={assessmentResult} />;
  }

  // ── Default: biodata registration form ──────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <img
              src="/nicrat-logo.png"
              alt="NICRAT"
              className="w-10 h-10 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">NCSR Self-Assessment</h1>
          <p className="mt-2 text-sm text-gray-500">
            Answer a few questions about your health to find out your risk level and get
            connected to a nearby screening centre. Takes about 5 minutes.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 space-y-5"
        >
          <Label>
            <span className="text-sm font-semibold">
              Full Name <span className="text-red-500">*</span>
            </span>
            <Input
              className={`mt-2 rounded-2xl h-12 ${errors.fullName ? "ring-2 ring-red-400" : ""}`}
              value={form.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              placeholder="Enter your full name"
            />
            {errors.fullName && (
              <span className="text-xs text-red-500 mt-1 block">{errors.fullName}</span>
            )}
          </Label>

          <div className="grid grid-cols-2 gap-4">
            <Label>
              <span className="text-sm font-semibold">
                Gender <span className="text-red-500">*</span>
              </span>
              <Select
                className={`mt-2 rounded-2xl h-12 ${errors.gender ? "ring-2 ring-red-400" : ""}`}
                value={form.gender}
                onChange={(e) => setField("gender", e.target.value)}
              >
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </Select>
              {errors.gender && (
                <span className="text-xs text-red-500 mt-1 block">{errors.gender}</span>
              )}
            </Label>

            <Label>
              <span className="text-sm font-semibold">
                Phone Number <span className="text-red-500">*</span>
              </span>
              <Input
                type="tel"
                className={`mt-2 rounded-2xl h-12 ${errors.phoneNumber ? "ring-2 ring-red-400" : ""}`}
                value={form.phoneNumber}
                onChange={(e) => setField("phoneNumber", e.target.value)}
                placeholder="080xxxxxxxx"
              />
              {errors.phoneNumber && (
                <span className="text-xs text-red-500 mt-1 block">{errors.phoneNumber}</span>
              )}
            </Label>
          </div>

          <Label>
            <span className="text-sm font-semibold">
              Email <span className="text-gray-400 font-normal">(optional)</span>
            </span>
            <Input
              type="email"
              className="mt-2 rounded-2xl h-12"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="you@example.com"
            />
          </Label>

          <div className="grid grid-cols-2 gap-4">
            <Label>
              <span className="text-sm font-semibold">
                State <span className="text-red-500">*</span>
              </span>
              <Select
                className={`mt-2 rounded-2xl h-12 ${errors.stateOfResidence ? "ring-2 ring-red-400" : ""}`}
                value={form.stateOfResidence}
                onChange={(e) => setField("stateOfResidence", e.target.value)}
              >
                <option value="">Select state</option>
                {nigerianStates.map((s) => (
                  <option key={s.code} value={s.name}>{s.name}</option>
                ))}
              </Select>
              {errors.stateOfResidence && (
                <span className="text-xs text-red-500 mt-1 block">{errors.stateOfResidence}</span>
              )}
            </Label>

            <Label>
              <span className="text-sm font-semibold">
                LGA <span className="text-red-500">*</span>
              </span>
              <Select
                className={`mt-2 rounded-2xl h-12 ${errors.lgaOfResidence ? "ring-2 ring-red-400" : ""}`}
                value={form.lgaOfResidence}
                disabled={!form.stateOfResidence}
                onChange={(e) => setField("lgaOfResidence", e.target.value)}
              >
                <option value="">Select LGA</option>
                {form.stateOfResidence &&
                  lgasByState[getStateCode(form.stateOfResidence)]?.map((lga) => (
                    <option key={lga} value={lga}>{lga}</option>
                  ))}
              </Select>
              {errors.lgaOfResidence && (
                <span className="text-xs text-red-500 mt-1 block">{errors.lgaOfResidence}</span>
              )}
            </Label>

            {availableAreas.length > 0 && (
              <Label className="col-span-2">
                <span className="text-sm font-semibold">
                  Area / District{" "}
                  <span className="text-gray-400 font-normal">(helps us find the closest centre)</span>
                </span>
                <Select
                  className="mt-2 rounded-2xl h-12"
                  value={form.areaOfResidence}
                  onChange={(e) => setField("areaOfResidence", e.target.value)}
                >
                  <option value="">Select your area</option>
                  {availableAreas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </Select>
              </Label>
            )}
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl bg-green-700 border-green-700 hover:bg-green-800 text-base font-semibold mt-2"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Getting started...
              </span>
            ) : (
              "Start My Assessment"
            )}
          </Button>

          <p className="text-center text-xs text-gray-400">
            We'll text you a verification code to confirm you consent to sharing this
            information for cancer screening linkage. Your information is kept confidential.
          </p>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        Platform powered by Resilience Nigeria
      </p>
    </div>
  );
}
