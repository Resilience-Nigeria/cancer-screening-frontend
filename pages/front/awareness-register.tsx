"use client";
import React, { useEffect, useState } from "react";
import { Button, Input, Label, Select } from "@roketid/windmill-react-ui";
import { CheckCircle, Loader2 } from "lucide-react";
import { nigerianStates, lgasByState, getStateCode } from "../../lib/nigerianstates";
import api from "@/lib/api";
import OtpVerificationStep from "../components/OtpVerificationService";

type Facility = {
  facilityName: string;
  facilityAddress?: string;
  navigatorName?: string;
  navigatorPhone?: string;
};

function SuccessScreen({
  name,
  email,
  facility,
}: {
  name: string;
  email: string;
  facility: Facility | null;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mx-auto">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">You're all set!</h1>
          <p className="mt-2 text-gray-500 text-sm">
            Thank you{name ? `, ${name.split(" ")[0]}` : ""}. Your number has been
            verified and you've been linked to a screening centre.
            {email
              ? " Check your WhatsApp and email for details."
              : " Check your WhatsApp for details."}
          </p>
        </div>

        {facility ? (
          <div className="rounded-2xl bg-white border border-green-100 shadow-md p-5 text-left space-y-3">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Your Screening Centre
            </p>
            <p className="text-lg font-bold text-gray-900">{facility.facilityName}</p>
            {facility.facilityAddress && (
              <p className="text-sm text-gray-500">{facility.facilityAddress}</p>
            )}
            {facility.navigatorName && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Your Contact Person</p>
                <p className="font-semibold text-gray-800">{facility.navigatorName}</p>
                {facility.navigatorPhone && (
                  
                    <a href={`tel:${facility.navigatorPhone}`}
                    className="inline-flex items-center gap-1.5 mt-1 text-green-700 font-medium text-sm hover:underline"
                  >
                    {facility.navigatorPhone}
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
            <p className="text-sm text-amber-700">
              Our team will reach out to you shortly with your screening centre details.
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Please attend your screening as soon as possible. Early detection saves lives.
        </p>
      </div>
    </div>
  );
}

export default function AwarenessRegistrationPage() {
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
        ? new URLSearchParams(window.location.search).get("src") ?? ""
        : "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<"form" | "otp" | "success">("form");
  const [registrationId, setRegistrationId] = useState<string>("");
  const [maskedPhone, setMaskedPhone] = useState<string>("");
  const [facility, setFacility] = useState<Facility | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
const [availableAreas, setAvailableAreas] = useState<string[]>([]);

  const [facilityFromStore, setFacilityFromStore] = useState<Facility | null>(null);


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
        params: {
          state: form.stateOfResidence,
          lga:   form.lgaOfResidence,
        },
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
  if (Object.keys(errs).length) { setErrors(errs); return; }

  setSubmitting(true);
  try {
    const { data } = await api.post(`/awareness/register`, form);
    setRegistrationId(String(data.registrationId));
    setMaskedPhone(data.maskedPhone);
    
    // 👇 Capture facility from store response — it's returned here
    if (data.facility) {
      setFacilityFromStore(data.facility);
    }
    
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
      onVerified={(fac) => {
        // Use facility from verify response, fall back to the one from store
        setFacility(fac ?? facilityFromStore);
        setStage("success");
      }}
    />
  );
}

  if (stage === "success") {
    return <SuccessScreen name={form.fullName} email={form.email} facility={facility} />;
  }

  // ── Default: registration form ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <img
              src="/nicrat-logo.png"
              alt="NICRAT"
              className="w-10 h-10 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cancer Screening Registration</h1>
          <p className="mt-2 text-sm text-gray-500">
            Register to be connected to the nearest screening centre in your area.
            This takes less than a minute.
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
              Email{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
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
                Registering...
              </span>
            ) : (
              "Register for Screening"
            )}
          </Button>

          <p className="text-center text-xs text-gray-400">
            Your information is kept confidential and used only for cancer screening linkage.
          </p>
        </form>
      </div>
    </div>
  );
}