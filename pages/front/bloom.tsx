"use client";
import React, { useEffect, useState } from "react";
import { Button, Input, Label, Select } from "@roketid/windmill-react-ui";
import { AlertTriangle, CheckCircle, Loader2, X, Minimize2, Maximize2, Info, Shield, AlertCircle } from "lucide-react";
import { nigerianStates, lgasByState, getStateCode } from "../../lib/nigerianstates";
import api from "@/lib/api";
import OtpVerificationStep from "../components/OtpVerificationService";

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

// Symptom Questions for Self Assessment
interface SymptomQuestion {
  id: string;
  category: string;
  text: string;
  description: string;
  gender: "all" | "female" | "male";
}

const symptomQuestions: SymptomQuestion[] = [
  // General Symptoms - All genders
  { id: "weight_loss", category: "General", text: "Have you noticed unexplained weight loss?", description: "Losing weight without trying", gender: "all" },
  { id: "fatigue", category: "General", text: "Have you been experiencing persistent fatigue?", description: "Feeling unusually tired or exhausted", gender: "all" },
  { id: "night_sweats", category: "General", text: "Have you been having night sweats?", description: "Waking up drenched in sweat", gender: "all" },
  { id: "fever", category: "General", text: "Have you had a persistent fever?", description: "Fever that doesn't go away", gender: "all" },

  // Breast Changes - All genders (men can get breast cancer too)
  { id: "breast_lump", category: "Breast Changes", text: "Have you noticed a lump in your breast or chest area?", description: "Any new lump or mass", gender: "all" },
  { id: "nipple_discharge", category: "Breast Changes", text: "Have you noticed any nipple discharge?", description: "Unusual fluid from the nipple", gender: "all" },
  { id: "breast_skin_changes", category: "Breast Changes", text: "Have you noticed skin changes on your breast?", description: "Dimpling, puckering, or redness", gender: "all" },

  // Other Lumps - All genders
  { id: "neck_lump", category: "Lumps", text: "Have you noticed a lump in your neck?", description: "Any swelling in the neck area", gender: "all" },
  { id: "underarm_lump", category: "Lumps", text: "Have you noticed a lump under your arm?", description: "Any swelling in the armpit", gender: "all" },
  { id: "groin_lump", category: "Lumps", text: "Have you noticed a lump in your groin?", description: "Any swelling in the groin area", gender: "all" },
  { id: "lump_elsewhere", category: "Lumps", text: "Have you noticed any lump elsewhere on your body?", description: "Any other unusual lump or swelling", gender: "all" },

  // Bleeding - All genders (except vaginal bleeding which is female only)
  { id: "blood_stool", category: "Bleeding", text: "Have you noticed blood in your stool?", description: "Red, dark, or black blood", gender: "all" },
  { id: "blood_urine", category: "Bleeding", text: "Have you noticed blood in your urine?", description: "Pink, red, or dark urine", gender: "all" },
  { id: "vaginal_bleeding", category: "Bleeding", text: "Have you had vaginal bleeding after menopause?", description: "Bleeding after periods have stopped", gender: "female" },
  { id: "bleeding_after_sex", category: "Bleeding", text: "Have you experienced bleeding after sex?", description: "Bleeding after intercourse", gender: "female" },

  // Pain - All genders
  { id: "breast_pain", category: "Pain", text: "Have you had persistent breast pain?", description: "Pain lasting more than 3 weeks", gender: "all" },
  { id: "abdominal_pain", category: "Pain", text: "Have you had persistent abdominal pain?", description: "Pain lasting more than 3 weeks", gender: "all" },
  { id: "back_pain", category: "Pain", text: "Have you had persistent back pain?", description: "Pain lasting more than 3 weeks", gender: "all" },

  // Digestive & Urinary - All genders
  { id: "bowel_habit_change", category: "Digestive & Urinary", text: "Have you noticed a change in your bowel habits?", description: "Constipation or diarrhea", gender: "all" },
  { id: "persistent_diarrhea", category: "Digestive & Urinary", text: "Have you had persistent diarrhea?", description: "Diarrhea lasting more than 2 weeks", gender: "all" },
  { id: "difficulty_urinating", category: "Digestive & Urinary", text: "Have you had difficulty passing urine?", description: "Trouble starting or maintaining urine flow", gender: "all" },
  { id: "frequent_urination", category: "Digestive & Urinary", text: "Have you been urinating more frequently than usual?", description: "Especially at night", gender: "all" },
  { id: "abdominal_swelling", category: "Digestive & Urinary", text: "Have you noticed persistent abdominal swelling?", description: "Bloating or swelling that doesn't go away", gender: "all" },
  { id: "jaundice", category: "Digestive & Urinary", text: "Have you noticed yellowing of your eyes or skin?", description: "Yellowish tint to skin or eyes", gender: "all" },

  // Additional female-specific questions
  { id: "abnormal_periods", category: "Female Health", text: "Have you had any abnormal or irregular periods?", description: "Unusual bleeding patterns or changes in your cycle", gender: "female" },
  { id: "pelvic_pain", category: "Female Health", text: "Have you had any persistent pelvic pain?", description: "Pain in your lower abdomen or pelvic area", gender: "female" },
];

// SelfAssessmentForm Component
function SelfAssessmentForm({ 
  registrationId, 
  gender, 
  onComplete 
}: { 
  registrationId: string; 
  gender: "male" | "female"; 
  onComplete: (result: AssessmentResult) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [age, setAge] = useState<string>("");
  const [ageError, setAgeError] = useState<string>("");

  // Filter questions based on gender
  const filteredQuestions = symptomQuestions.filter(q => q.gender === "all" || q.gender === gender);
  const questionsPerPage = 4;
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const currentQuestions = filteredQuestions.slice(
    currentStep * questionsPerPage,
    (currentStep + 1) * questionsPerPage
  );

  const handleAnswer = (questionId: string, value: boolean) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setError(null);
  };

  const validateAge = () => {
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
      setAgeError("Please enter a valid age between 18 and 120");
      return false;
    }
    setAgeError("");
    return true;
  };

  const handleNext = () => {
    setError(null);
    
    // If we're on the age step (step 0), validate age first
    if (currentStep === 0) {
      if (!validateAge()) {
        return;
      }
    }
    
    if (currentStep < totalPages) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
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

    const reportedSymptoms = filteredQuestions
      .filter(q => answers[q.id] === true)
      .map(q => q.id);

    const payload = {
      age: parseInt(age),
      answers: {
        symptoms: reportedSymptoms,
      },
    };

    const { data } = await api.post(`/awareness/${registrationId}/self-assessment`, payload);

    const result: AssessmentResult = {
      assessmentId: data.assessmentId,
      riskCategory: data.riskCategory,
      recommendation: data.recommendation,
      flaggedReasons: data.flaggedReasons,
      facility: data.facility ?? undefined,
    };

    onComplete(result);
  } catch (err: any) {
    console.error("Submission error:", err);
    const errorMessage = err?.response?.data?.message ||
      err?.response?.data?.errors?.answers?.[0] ||
      err?.response?.data?.errors?.age?.[0] ||
      "An error occurred while submitting your assessment. Please try again.";
    setError(errorMessage);
  } finally {
    setSubmitting(false);
  }
};

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "General": "bg-gray-100 text-gray-800",
      "Breast Changes": "bg-pink-100 text-pink-800",
      "Lumps": "bg-yellow-100 text-yellow-800",
      "Bleeding": "bg-red-100 text-red-800",
      "Pain": "bg-orange-100 text-orange-800",
      "Digestive & Urinary": "bg-green-100 text-green-800",
      "Female Health": "bg-purple-100 text-purple-800"
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
              <h2 className="text-xl font-bold text-gray-900">Your Age</h2>
              <p className="text-sm text-gray-500 mt-1">
                Please enter your age to help us assess your risk factors.
              </p>
              <p className="text-xs text-gray-400 mt-1 italic">
                Age is an important factor in cancer risk assessment.
              </p>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>0%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full transition-all duration-300" style={{ width: '0%' }} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Page 1 of {totalPages + 1}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-6">
              <div className="p-4 rounded-2xl border-2 border-gray-200">
                <Label>
                  <span className="text-sm font-semibold">
                    Age <span className="text-red-500">*</span>
                  </span>
                  <Input
                    type="number"
                    className={`mt-2 rounded-2xl h-12 ${ageError ? "ring-2 ring-red-400" : ""}`}
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value);
                      setAgeError("");
                    }}
                    placeholder="Enter your age (18-120)"
                    min="18"
                    max="120"
                  />
                  {ageError && (
                    <span className="text-xs text-red-500 mt-1 block">{ageError}</span>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    You must be at least 18 years old to use this service.
                  </p>
                </Label>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 transition-colors"
              >
                Next
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400">
                Your age helps us provide more accurate risk assessment.
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Your responses are confidential and will only be used for your health assessment.
            </p>
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
            <h2 className="text-xl font-bold text-gray-900">Health Assessment</h2>
            <p className="text-sm text-gray-500 mt-1">
              Have you noticed any of these? Select anything you've experienced recently.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              This is the most important section — please be thorough.
            </p>
            <p className="text-xs text-gray-400 mt-1 italic">
              Questions are optional. Only select &quot;Yes&quot; for symptoms you have experienced.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Showing questions relevant to {gender === "female" ? "women" : "men"}.
            </p>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(((currentStep) / (totalPages + 1)) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep) / (totalPages + 1)) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Page {currentStep + 1} of {totalPages + 1}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
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
                    isAnswered 
                      ? answer 
                        ? "border-red-300 bg-red-50" 
                        : "border-green-300 bg-green-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(question.category)}`}>
                          {question.category}
                        </span>
                        {question.gender !== "all" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            {question.gender === "female" ? "Women's Health" : "Men's Health"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{question.text}</p>
                      <p className="text-xs text-gray-500 mt-1">💡 {question.description}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAnswer(question.id, true)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          answer === true
                            ? "bg-red-600 text-white ring-2 ring-red-600 ring-offset-2"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Yes
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
                        No
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
                          Skip
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
              Previous
            </button>

            {currentStep < totalPages ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-green-700 text-white rounded-xl font-medium hover:bg-green-800 transition-colors"
              >
                Next
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
                    Submitting...
                  </span>
                ) : (
                  "Submit Assessment"
                )}
              </button>
            )}
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              Questions you don&apos;t answer will be treated as &quot;No&quot;.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Your responses are confidential and will only be used for your health assessment.
          </p>
        </div>
      </div>
    </div>
  );
}

// ResultsScreen Component
function ResultsScreen({ name, result }: { name: string; result: AssessmentResult }) {
  const style = RISK_STYLES[result.riskCategory];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 flex-1 flex flex-col justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Thank you{name ? `, ${name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-2 text-sm text-gray-500">Here's what your assessment found:</p>
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

          <p className="text-xl text-gray-400 italic">
            Please note that this is a decision-support tool, NOT a diagnosis. Please discuss these results with a healthcare provider.
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
            {result.facility.clinicHoursDisplay && (
              <p className="text-sm text-gray-500">🕐 {result.facility.clinicHoursDisplay}</p>
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

// Info Popup Component
function InfoPopup({ isOpen, onClose, isMinimized, onToggleMinimize }: { 
  isOpen: boolean; 
  onClose: () => void; 
  isMinimized: boolean;
  onToggleMinimize: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-2xl transition-all duration-300 ${
        isMinimized ? 'h-auto max-h-16' : 'max-h-[90vh]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <Info className="w-5 h-5 text-green-700" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">About This Program</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMinimize}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="space-y-6">
              {/* Program Overview */}
              <div>
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">Program Overview</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  The Cancer Self-Assessment section of this Portal is a free, confidential initiative by the <b>National Institute for Cancer Research and Treatment</b>. It is
                  designed to help you understand your personal cancer risk factors and connect you with 
                  appropriate screening services. This program is part of Nigeria's commitment to early 
                  cancer detection and prevention.
                </p>
              </div>

              {/* What to Expect */}
              <div>
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">What to Expect</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>A brief assessment of your personal and family health history</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>Confidential risk analysis based on evidence-based guidelines</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>Referral to your nearest screening center if needed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>Follow-up support from our patient navigators</span>
                  </li>
                </ul>
              </div>

              {/* How It Works */}
              <div>
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">How It Works</h3>
                <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
                  <li>Fill in your personal information (name, contact details, location)</li>
                  <li>Review and accept the consent agreement</li>
                  <li>Complete the health assessment questionnaire (about 5 minutes)</li>
                  <li>Receive your personalized risk assessment result</li>
                  <li>Get connected to a nearby screening center if recommended</li>
                </ol>
              </div>

              {/* Privacy & Security */}
              <div>
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">Privacy & Security</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Your privacy is our priority. All information you provide is encrypted and stored securely. 
                  Data is only accessible to authorized healthcare personnel and used solely for the purpose 
                  of cancer screening coordination. You can withdraw your consent at any time.
                </p>
              </div>

              {/* Need Help? */}
              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-green-800 mb-2">Need Help?</h3>
                <p className="text-sm text-gray-600">
                  If you have questions or need assistance with the assessment:
                </p>
                <div className="mt-2 text-sm">
                  <p className="text-gray-700">
                    <span className="font-medium">Call:</span>{' '}
                    <a href="tel:08001234567" className="text-green-700 hover:underline">0800-123-4567</a>
                  </p>
                  <p className="text-gray-700">
                    <span className="font-medium">Email:</span>{' '}
                    <a href="mailto:support@resilienceng.org" className="text-green-700 hover:underline">
                      support@ncsr.nicrat.gov.ng
                    </a>
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-colors"
                >
                  Got it, let's begin!
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
  onDecline 
}: { 
  isOpen: boolean; 
  onConsent: () => void; 
  onDecline: () => void;
}) {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-100 rounded-full">
              <Shield className="w-6 h-6 text-green-700" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Consent Required</h2>
          </div>

          <div className="space-y-4 mb-6">
            <p className="text-gray-700 leading-relaxed">
              Before you can proceed with the cancer screening assessment, we need your consent to collect and use your information.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-blue-900">What This Means</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Your information will be used to assess your cancer screening needs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Data will be shared with authorized healthcare personnel only</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>You may be contacted or referred for further assessment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>All information is encrypted and stored securely</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>You can withdraw your consent at any time</span>
                </li>
              </ul>
            </div>

            <p className="text-sm text-gray-600 italic">
              By providing your consent, you acknowledge that this assessment is a decision-support tool, NOT a diagnosis, and you understand that you will be contacted for further screening services as needed.
            </p>

            <label className="flex items-start gap-3 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-1 w-4 h-4 text-green-700 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">
                I have read and understood this information. I consent to the collection and use of my information for the purpose of cancer screening linkage services.
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onDecline}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Decline
            </button>
            <button
              onClick={onConsent}
              disabled={!isChecked}
              className={`flex-1 py-3 px-4 font-semibold rounded-xl transition-colors ${
                isChecked
                  ? "bg-green-700 text-white hover:bg-green-800"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              I Agree & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main BloomPage Component
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
  const [stage, setStage] = useState<"consent" | "form" | "otp" | "assessment" | "results">("consent");
  const [registrationId, setRegistrationId] = useState<string>("");
  const [maskedPhone, setMaskedPhone] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [isPopupMinimized, setIsPopupMinimized] = useState(false);
  const [showConsentPopup, setShowConsentPopup] = useState(true);

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
    if (!consentChecked) e.consent = "You must agree to the terms to proceed.";
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

  // Handle consent
  const handleConsent = () => {
    setShowConsentPopup(false);
    setStage("form");
    setConsentChecked(true);
    setShowInfoPopup(true);
  };

  const handleDecline = () => {
    alert("You must provide consent to use this service.");
  };

  // ── Stage gates ──────────────────────────────────────────────────────────
  if (stage === "consent") {
    return (
      <>
        <ConsentPopup 
          isOpen={showConsentPopup}
          onConsent={handleConsent}
          onDecline={handleDecline}
        />
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col items-center justify-center p-4">
          <div className="text-center">
            <div>
              <img
                src="/assets/img/NCSR.svg"
                alt="NCSR Logo"
                className="mx-auto"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <div className="mt-8 animate-pulse">
              <div className="w-12 h-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading consent form...</p>
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
      {/* Info Popup */}
      <InfoPopup 
        isOpen={showInfoPopup}
        onClose={() => setShowInfoPopup(false)}
        isMinimized={isPopupMinimized}
        onToggleMinimize={() => setIsPopupMinimized(!isPopupMinimized)}
      />

      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full flex-1 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div>
              <img
                src="/assets/img/NCSR.svg"
                alt="NCSR Logo"
                className="mx-auto"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Cancer Self-Assessment Portal</h1>
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
            <p className="text-sm leading-relaxed mb-2 italic text-red-500">
              Current location information helps us connect you to the nearest screening centre.
            </p> 
            <div className="grid grid-cols-2 gap-4">
              <Label>
                <span className="text-sm font-semibold">
                  State of Residence <span className="text-red-500">*</span>
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
                  LGA of Residence <span className="text-red-500">*</span>
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

              {(form.stateOfResidence && form.lgaOfResidence) && (
                <Label className="col-span-2">
                  <span className="text-sm font-semibold">
                    Area / District{" "}
                    <span className="text-gray-400 font-normal">(helps us find the closest centre)</span>
                  </span>
                  {availableAreas.length > 0 ? (
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
                  ) : (
                    <Input
                      className="mt-2 rounded-2xl h-12"
                      value={form.areaOfResidence}
                      onChange={(e) => setField("areaOfResidence", e.target.value)}
                      placeholder="Type your area, ward, or district"
                    />
                  )}
                </Label>
              )}
            </div>

            {/* Consent indicator */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-700 flex-shrink-0" />
              <p className="text-sm text-green-800">
                ✓ You have provided consent to proceed with this assessment.
              </p>
            </div>
            
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-2xl text-base font-semibold mt-2 bg-green-700 border-green-700 hover:bg-green-800"
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
              We'll text you a verification code to confirm your identity for cancer screening linkage. Your information is kept confidential.
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Platform powered by Resilience Nigeria
        </p>
      </div>
    </>
  );
}