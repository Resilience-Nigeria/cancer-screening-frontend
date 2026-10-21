"use client";
import React, { useEffect, useState } from "react";
import { Button, Input, Label, Select } from "@roketid/windmill-react-ui";
import { AlertTriangle, CheckCircle, Loader2, X, Minimize2, Maximize2, Info, Shield, AlertCircle } from "lucide-react";
import { nigerianStates, lgasByState, getStateCode } from "../../lib/nigerianstates";
import api from "@/lib/api";
import OtpVerificationStep from "../components/OtpVerificationService";
import { LanguageProvider, useLanguage } from "@/lib/i18n/LanguageProvider";
import { LanguageGate, LanguageSwitcher } from "../components/LanguageUI";
import PoweredBy from "../components/PoweredBy";


// Assessment Result Interface
export interface AssessmentResult {
  assessmentId: string;
  riskCategory: "low" | "average" | "increased" | "symptomatic_high";
  recommendation: string;
  flaggedReasons: string[];
  facility?: {
    facilityName: string;
    facilityAddress?: string;
    clinicHoursDisplay?: string;
    navigatorName?: string;
    navigatorPhone?: string;
  };
}

// Labels now come from translations (risk.<category>)
const RISK_STYLES: Record<AssessmentResult["riskCategory"], { badge: string; icon: React.ReactNode }> = {
  low: { badge: "bg-green-100 text-green-800", icon: <CheckCircle className="w-5 h-5" /> },
  average: { badge: "bg-green-200 text-green-800", icon: <CheckCircle className="w-5 h-5" /> },
  increased: { badge: "bg-green-400 text-green-900", icon: <AlertTriangle className="w-5 h-5" /> },
  symptomatic_high: { badge: "bg-green-700 text-white", icon: <AlertTriangle className="w-5 h-5" /> },
};

// Symptom questions. Text/description are looked up via t(`q.${id}.text`) / t(`q.${id}.desc`)
// and the category via t(`cat.${category}`). The `category` string stays in English as a key.
interface SymptomQuestion {
  id: string;
  category: string;
  gender: "all" | "female" | "male";
}

const symptomQuestions: SymptomQuestion[] = [
  { id: "weight_loss", category: "General", gender: "all" },
  { id: "fatigue", category: "General", gender: "all" },
  { id: "night_sweats", category: "General", gender: "all" },
  { id: "fever", category: "General", gender: "all" },

  { id: "breast_lump", category: "Breast Changes", gender: "all" },
  { id: "nipple_discharge", category: "Breast Changes", gender: "all" },
  { id: "breast_skin_changes", category: "Breast Changes", gender: "all" },

  { id: "neck_lump", category: "Lumps", gender: "all" },
  { id: "underarm_lump", category: "Lumps", gender: "all" },
  { id: "groin_lump", category: "Lumps", gender: "all" },
  { id: "lump_elsewhere", category: "Lumps", gender: "all" },

  { id: "blood_stool", category: "Bleeding", gender: "all" },
  { id: "blood_urine", category: "Bleeding", gender: "all" },
  { id: "vaginal_bleeding", category: "Bleeding", gender: "female" },
  { id: "bleeding_after_sex", category: "Bleeding", gender: "female" },

  { id: "breast_pain", category: "Pain", gender: "all" },
  { id: "abdominal_pain", category: "Pain", gender: "all" },
  { id: "back_pain", category: "Pain", gender: "all" },

  { id: "bowel_habit_change", category: "Digestive & Urinary", gender: "all" },
  { id: "persistent_diarrhea", category: "Digestive & Urinary", gender: "all" },
  { id: "difficulty_urinating", category: "Digestive & Urinary", gender: "all" },
  { id: "frequent_urination", category: "Digestive & Urinary", gender: "all" },
  { id: "abdominal_swelling", category: "Digestive & Urinary", gender: "all" },
  { id: "jaundice", category: "Digestive & Urinary", gender: "all" },

  { id: "abnormal_periods", category: "Female Health", gender: "female" },
  { id: "pelvic_pain", category: "Female Health", gender: "female" },
];

// SelfAssessmentForm Component
function SelfAssessmentForm({
  registrationId,
  gender,
  onComplete,
}: {
  registrationId: string;
  gender: "male" | "female";
  onComplete: (result: AssessmentResult) => void;
}) {
  const { t, language } = useLanguage();
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  // Either an "err.*" translation key or a raw message from the API
  const [error, setError] = useState<string | null>(null);
  const [age, setAge] = useState<string>("");
  const [ageInvalid, setAgeInvalid] = useState(false);

  const tr = (m: string) => (m.startsWith("err.") ? t(m) : m);

  // Filter questions based on gender
  const filteredQuestions = symptomQuestions.filter((q) => q.gender === "all" || q.gender === gender);
  const questionsPerPage = 4;
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);

  const handleAnswer = (questionId: string, value: boolean) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setError(null);
  };

  const validateAge = () => {
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
      setAgeInvalid(true);
      return false;
    }
    setAgeInvalid(false);
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 0 && !validateAge()) return;
    if (currentStep < totalPages) setCurrentStep((prev) => prev + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      if (!validateAge()) {
        setSubmitting(false);
        return;
      }

      const reportedSymptoms = filteredQuestions.filter((q) => answers[q.id] === true).map((q) => q.id);

      const payload = {
        age: parseInt(age),
        language, // so the backend can localise the recommendation text
        answers: {
          symptoms: reportedSymptoms,
        },
      };

      const { data } = await api.post(`/awareness/${registrationId}/self-assessment`, payload);

      onComplete({
        assessmentId: data.assessmentId,
        riskCategory: data.riskCategory,
        recommendation: data.recommendation,
        flaggedReasons: data.flaggedReasons,
        facility: data.facility ?? undefined,
      });
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.answers?.[0] ||
          err?.response?.data?.errors?.age?.[0] ||
          "err.submit"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      General: "bg-gray-100 text-gray-800",
      "Breast Changes": "bg-pink-100 text-pink-800",
      Lumps: "bg-yellow-100 text-yellow-800",
      Bleeding: "bg-red-100 text-red-800",
      Pain: "bg-orange-100 text-orange-800",
      "Digestive & Urinary": "bg-green-100 text-green-800",
      "Female Health": "bg-purple-100 text-purple-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  // Render age input as first page
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t("age.title")}</h2>
              <p className="text-sm text-gray-500 mt-1">{t("age.desc")}</p>
              <p className="text-xs text-gray-400 mt-1 italic">{t("age.note")}</p>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{t("common.progress")}</span>
                <span>0%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full transition-all duration-300" style={{ width: "0%" }} />
              </div>
              <p className="text-xs text-gray-500 mt-2">{t("common.pageOf", { current: 1, total: totalPages + 1 })}</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{tr(error)}</span>
              </div>
            )}

            <div className="space-y-6">
              <div className="p-4 rounded-2xl border-2 border-gray-200">
                <Label>
                  <span className="text-sm font-semibold">
                    {t("age.label")} <span className="text-red-500">*</span>
                  </span>
                  <Input
                    type="number"
                    className={`mt-2 rounded-2xl h-12 ${ageInvalid ? "ring-2 ring-red-400" : ""}`}
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value);
                      setAgeInvalid(false);
                    }}
                    placeholder={t("age.ph")}
                    min="18"
                    max="120"
                  />
                  {ageInvalid && <span className="text-xs text-red-500 mt-1 block">{t("err.age")}</span>}
                  <p className="text-xs text-gray-400 mt-2">{t("age.must")}</p>
                </Label>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 transition-colors"
              >
                {t("common.next")}
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400">{t("age.helps")}</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">{t("common.confidential")}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render symptom questions (adjusted indexing)
  const symptomStep = currentStep - 1; // Adjust for age page
  const currentSymptomQuestions = filteredQuestions.slice(
    symptomStep * questionsPerPage,
    (symptomStep + 1) * questionsPerPage
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t("assess.title")}</h2>
            <p className="text-sm text-gray-500 mt-1">{t("assess.desc")}</p>
            <p className="text-xs text-gray-400 mt-1">{t("assess.important")}</p>
            <p className="text-xs text-gray-400 mt-1 italic">{t("assess.optional")}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t(gender === "female" ? "assess.showingWomen" : "assess.showingMen")}
            </p>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{t("common.progress")}</span>
              <span>{Math.round((currentStep / (totalPages + 1)) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / (totalPages + 1)) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t("common.pageOf", { current: currentStep + 1, total: totalPages + 1 })}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{tr(error)}</span>
            </div>
          )}

          <div className="space-y-6">
            {currentSymptomQuestions.map((question) => {
              const answer = answers[question.id];
              const isAnswered = answer !== undefined;

              return (
                <div
                  key={question.id}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    isAnswered ? "border-green-300 bg-green-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(question.category)}`}>
                          {t(`cat.${question.category}`)}
                        </span>
                        {question.gender !== "all" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            {question.gender === "female" ? t("assess.womens") : t("assess.mens")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{t(`q.${question.id}.text`)}</p>
                      <p className="text-xs text-gray-500 mt-1">💡 {t(`q.${question.id}.desc`)}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAnswer(question.id, true)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          answer === true
                            ? "bg-green-600 text-white ring-2 ring-green-600 ring-offset-2"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {t("common.yes")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAnswer(question.id, false)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          answer === false
                            ? "bg-green-600 text-white ring-2 ring-green-600 ring-offset-2"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {t("common.no")}
                      </button>
                      {!isAnswered && (
                        <button
                          type="button"
                          onClick={() => {
                            const newAnswers = { ...answers };
                            delete newAnswers[question.id];
                            setAnswers(newAnswers);
                          }}
                          className="px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                        >
                          {t("common.skip")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-between">
            <button
              type="button"
              onClick={handlePrevious}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              {t("common.previous")}
            </button>

            {currentStep < totalPages ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 transition-colors"
              >
                {t("common.next")}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 transition-colors disabled:bg-gray-400"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("assess.submitting")}
                  </span>
                ) : (
                  t("assess.submit")
                )}
              </button>
            )}
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">{t("assess.unanswered")}</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">{t("common.confidential")}</p>
        </div>
      </div>
    </div>
  );
}

// ResultsScreen Component
function ResultsScreen({ name, result }: { name: string; result: AssessmentResult }) {
  const { t } = useLanguage();
  const style = RISK_STYLES[result.riskCategory];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 flex-1 flex flex-col justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("res.thanks")}
            {name ? `, ${name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-2 text-sm text-gray-500">{t("res.found")}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 space-y-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${style.badge}`}>
            {style.icon}
            {t(`risk.${result.riskCategory}`)}
          </div>

          {/* Server-generated text: localised by the backend based on the `language` we send */}
          <p className="text-sm text-gray-700 leading-6">{result.recommendation}</p>

          {result.flaggedReasons.length > 0 && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("res.basedOn")}</p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                {result.flaggedReasons.map((r, i) => (
                  <li key={i} className="capitalize">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xl text-gray-400 italic">{t("res.disclaimer")}</p>
        </div>

        {result.facility ? (
          <div className="rounded-2xl bg-white border border-green-100 shadow-md p-5 text-left space-y-3">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">{t("res.centre")}</p>
            <p className="text-lg font-bold text-gray-900">{result.facility.facilityName}</p>
            {result.facility.facilityAddress && <p className="text-sm text-gray-500">{result.facility.facilityAddress}</p>}
            {result.facility.clinicHoursDisplay && (
              <p className="text-sm text-gray-500">🕐 {result.facility.clinicHoursDisplay}</p>
            )}
            {result.facility.navigatorName && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">{t("res.contactPerson")}</p>
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
            <p className="text-sm text-amber-700">{t("res.followup")}</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">{t("res.attend")}</p>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">{t("common.poweredBy")}</p>
    </div>
  );
}

// Info Popup Component
function InfoPopup({
  isOpen,
  onClose,
  isMinimized,
  onToggleMinimize,
}: {
  isOpen: boolean;
  onClose: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const bullets = ["info.e1", "info.e2", "info.e3", "info.e4"];
  const steps = ["info.h1", "info.h2", "info.h3", "info.h4", "info.h5"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-2xl transition-all duration-300 ${
          isMinimized ? "h-auto max-h-16" : "max-h-[90vh]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <Info className="w-5 h-5 text-green-700" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{t("info.title")}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMinimize}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={isMinimized ? t("info.maximize") : t("info.minimize")}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={t("info.close")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">
                  {t("info.overviewTitle")}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t("info.overview1")} <b>{t("info.institute")}</b>
                  {t("info.overview2")}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">
                  {t("info.expectTitle")}
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  {bullets.map((k) => (
                    <li key={k} className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">•</span>
                      <span>{t(k)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">{t("info.howTitle")}</h3>
                <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
                  {steps.map((k) => (
                    <li key={k}>{t(k)}</li>
                  ))}
                </ol>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">
                  {t("info.privacyTitle")}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{t("info.privacy")}</p>
              </div>

              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-green-800 mb-2">{t("info.helpTitle")}</h3>
                <p className="text-sm text-gray-600">{t("info.helpText")}</p>
                <div className="mt-2 text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium">{t("info.call")}</span>{" "}
                    <a href="tel:08001234567" className="text-green-700 hover:underline">
                      0800-123-4567
                    </a>
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">{t("info.email")}</span>{" "}
                    <a href="mailto:support@resilienceng.org" className="text-green-700 hover:underline">
                      support@ncsr.nicrat.gov.ng
                    </a>
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-colors"
                >
                  {t("info.gotIt")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ConsentPopup Component
function ConsentPopup({
  isOpen,
  onConsent,
  onDecline,
}: {
  isOpen: boolean;
  onConsent: () => void;
  onDecline: () => void;
}) {
  const { t } = useLanguage();
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  const points = ["consent.m1", "consent.m2", "consent.m3", "consent.m4", "consent.m5"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 rounded-full">
              <Shield className="w-6 h-6 text-green-700" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{t("consent.title")}</h2>
          </div>

          <div className="space-y-4 mb-6">
            <p className="text-gray-700 leading-relaxed">{t("consent.intro")}</p>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-blue-900">{t("consent.meansTitle")}</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {points.map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-sm text-gray-600 italic">{t("consent.note")}</p>

            <label className="flex items-start gap-3 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-1 w-4 h-4 text-green-700 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">{t("consent.checkbox")}</span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onDecline}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              {t("consent.decline")}
            </button>
            <button
              onClick={onConsent}
              disabled={!isChecked}
              className={`flex-1 py-3 px-4 font-semibold rounded-xl transition-colors ${
                isChecked ? "bg-green-700 text-white hover:bg-green-800" : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {t("consent.agree")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page entry: provider + first-load language prompt ───────────────────────
export default function BloomPage() {
  return (
    <LanguageProvider>
      <LanguageGate />
      <LanguageSwitcher />
      <BloomPageInner />
    </LanguageProvider>
  );
}

// Main page component
function BloomPageInner() {
  const { t, language, confirmed } = useLanguage();

  const [form, setForm] = useState({
    fullName: "",
    gender: "",
    phoneNumber: "",
    email: "",
    stateOfResidence: "",
    lgaOfResidence: "",
    areaOfResidence: "",
    campaignSource:
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("src") ?? "bloom" : "bloom",
  });

  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<"consent" | "form" | "otp" | "assessment" | "results">("consent");
  const [registrationId, setRegistrationId] = useState<string>("");
  const [maskedPhone, setMaskedPhone] = useState<string>("");
  // Values are either "err.*" translation keys or raw messages from the API
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [isPopupMinimized, setIsPopupMinimized] = useState(false);
  const [showConsentPopup, setShowConsentPopup] = useState(true);

  const tr = (m?: string) => (m ? (m.startsWith("err.") ? t(m) : m) : "");

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
    if (!form.fullName.trim()) e.fullName = "err.fullName";
    if (!form.gender) e.gender = "err.gender";
    if (!form.phoneNumber.trim()) e.phoneNumber = "err.phone";
    if (!form.stateOfResidence) e.stateOfResidence = "err.state";
    if (!form.lgaOfResidence) e.lgaOfResidence = "err.lga";
    if (!consentChecked) e.consent = "err.consent";
    return e;
  }

  useEffect(() => {
    if (!form.stateOfResidence || !form.lgaOfResidence) {
      setAvailableAreas([]);
      setForm((prev) => ({ ...prev, areaOfResidence: "" }));
      return;
    }
    setLoadingAreas(true);
    (async () => {
      try {
        const { data } = await api.get("/areas", {
          params: { state: form.stateOfResidence, lga: form.lgaOfResidence },
        });
        setAvailableAreas(data?.areas ?? []);
        setForm((prev) => ({ ...prev, areaOfResidence: "" }));
      } catch {
        setAvailableAreas([]);
      } finally {
        setLoadingAreas(false);
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
      const { data } = await api.post("/awareness/register", { ...form, language });
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
        Object.keys(mapped).length ? mapped : { fullName: err?.response?.data?.message ?? "err.generic" }
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Handle consent
  const handleConsent = () => {
    setShowConsentPopup(false);
    setStage("form");
    setConsentChecked(true);
    setShowInfoPopup(true);
  };

  const handleDecline = () => {
    alert(t("consent.declineAlert"));
  };

  // ── Stage gates ──────────────────────────────────────────────────────────
  if (stage === "consent") {
    return (
      <>
        {/* Consent only appears after the visitor has chosen a language */}
        <ConsentPopup isOpen={showConsentPopup && confirmed} onConsent={handleConsent} onDecline={handleDecline} />
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col items-center justify-center p-4">
          <div className="text-center">
            <div>
              <img
                src="/assets/img/NCSR.svg"
                alt="NCSR Logo"
                className="mx-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="mt-8 animate-pulse">
              <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600">{t("consent.loading")}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

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
    <>
      <InfoPopup
        isOpen={showInfoPopup}
        onClose={() => setShowInfoPopup(false)}
        isMinimized={isPopupMinimized}
        onToggleMinimize={() => setIsPopupMinimized(!isPopupMinimized)}
      />

      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full flex-1 flex flex-col justify-center">
          <div className="text-center mb-8 mt-10">
            <div>
              <img
                src="/assets/img/NCSR.svg"
                alt="NCSR Logo"
                className="mx-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t("form.title")}</h1>
            <p className="mt-2 text-sm text-gray-500">{t("form.subtitle")}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 space-y-5"
          >
            <Label>
              <span className="text-sm font-semibold">
                {t("form.fullName")} <span className="text-red-500">*</span>
              </span>
              <Input
                className={`mt-2 rounded-2xl h-12 ${errors.fullName ? "ring-2 ring-red-400" : ""}`}
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                placeholder={t("form.fullNamePh")}
              />
              {errors.fullName && <span className="text-xs text-red-500 mt-1 block">{tr(errors.fullName)}</span>}
            </Label>

            <div className="grid grid-cols-2 gap-4">
              <Label>
                <span className="text-sm font-semibold">
                  {t("form.gender")} <span className="text-red-500">*</span>
                </span>
                <Select
                  className={`mt-2 rounded-2xl h-12 ${errors.gender ? "ring-2 ring-red-400" : ""}`}
                  value={form.gender}
                  onChange={(e) => setField("gender", e.target.value)}
                >
                  <option value="">{t("form.select")}</option>
                  <option value="female">{t("form.female")}</option>
                  <option value="male">{t("form.male")}</option>
                </Select>
                {errors.gender && <span className="text-xs text-red-500 mt-1 block">{tr(errors.gender)}</span>}
              </Label>

              <Label>
                <span className="text-sm font-semibold">
                  {t("form.phone")} <span className="text-red-500">*</span>
                </span>
                <Input
                  type="tel"
                  className={`mt-2 rounded-2xl h-12 ${errors.phoneNumber ? "ring-2 ring-red-400" : ""}`}
                  value={form.phoneNumber}
                  onChange={(e) => setField("phoneNumber", e.target.value)}
                  placeholder="080xxxxxxxx"
                />
                {errors.phoneNumber && <span className="text-xs text-red-500 mt-1 block">{tr(errors.phoneNumber)}</span>}
              </Label>
            </div>

            <Label>
              <span className="text-sm font-semibold">
                {t("form.email")} <span className="text-gray-400 font-normal">{t("form.optional")}</span>
              </span>
              <Input
                type="email"
                className="mt-2 rounded-2xl h-12"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="you@example.com"
              />
            </Label>
            <p className="text-sm leading-relaxed mb-2 italic text-red-500">{t("form.locationNote")}</p>
            <div className="grid grid-cols-2 gap-4">
              <Label>
                <span className="text-sm font-semibold">
                  {t("form.state")} <span className="text-red-500">*</span>
                </span>
                <Select
                  className={`mt-2 rounded-2xl h-12 ${errors.stateOfResidence ? "ring-2 ring-red-400" : ""}`}
                  value={form.stateOfResidence}
                  onChange={(e) => setField("stateOfResidence", e.target.value)}
                >
                  <option value="">{t("form.selectState")}</option>
                  {nigerianStates.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                {errors.stateOfResidence && (
                  <span className="text-xs text-red-500 mt-1 block">{tr(errors.stateOfResidence)}</span>
                )}
              </Label>

              <Label>
                <span className="text-sm font-semibold">
                  {t("form.lga")} <span className="text-red-500">*</span>
                </span>
                <Select
                  className={`mt-2 rounded-2xl h-12 ${errors.lgaOfResidence ? "ring-2 ring-red-400" : ""}`}
                  value={form.lgaOfResidence}
                  disabled={!form.stateOfResidence}
                  onChange={(e) => setField("lgaOfResidence", e.target.value)}
                >
                  <option value="">{t("form.selectLga")}</option>
                  {form.stateOfResidence &&
                    lgasByState[getStateCode(form.stateOfResidence)]?.map((lga) => (
                      <option key={lga} value={lga}>
                        {lga}
                      </option>
                    ))}
                </Select>
                {errors.lgaOfResidence && (
                  <span className="text-xs text-red-500 mt-1 block">{tr(errors.lgaOfResidence)}</span>
                )}
              </Label>

              {form.stateOfResidence && form.lgaOfResidence && (
                <Label className="col-span-2">
                  <span className="text-sm font-semibold">
                    {t("form.area")} <span className="text-gray-400 font-normal">{t("form.areaHint")}</span>
                  </span>
                  {availableAreas.length > 0 ? (
                    <Select
                      className="mt-2 rounded-2xl h-12"
                      value={form.areaOfResidence}
                      onChange={(e) => setField("areaOfResidence", e.target.value)}
                    >
                      <option value="">{t("form.selectArea")}</option>
                      {availableAreas.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      className="mt-2 rounded-2xl h-12"
                      value={form.areaOfResidence}
                      onChange={(e) => setField("areaOfResidence", e.target.value)}
                      placeholder={t("form.areaPh")}
                    />
                  )}
                </Label>
              )}
            </div>

            {/* Consent indicator */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-700 flex-shrink-0" />
              <p className="text-sm text-green-800">{t("form.consentGiven")}</p>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-2xl text-base font-semibold mt-2 bg-green-700 border-green-700 hover:bg-green-800"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("form.starting")}
                </span>
              ) : (
                t("form.start")
              )}
            </Button>

            <p className="text-center text-xs text-gray-400">{t("form.otpNote")}</p>
          </form>
        </div>

        {/*<p className="mt-6 text-center text-xs text-gray-400">{t("common.poweredBy")}</p>*/}
        <PoweredBy />

      </div>
    </>
  );
}