import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Input,
  HelperText,
  Label,
  Select,
  Textarea,
  Button,
} from "@roketid/windmill-react-ui";
import {
  ChevronRight,
  ShieldCheck,
  Loader2,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import SectionTitle from "../components/Typography/SectionTitle";
import api from "../../lib/api";

type ClientSummary = {
  clientId: number;
  fullName: string;
  phoneNumber?: string | null;
};

export default function OutcomePage() {
  const router = useRouter();
  const { clientId } = router.query;

  const [client, setClient] = useState<ClientSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    // PRE-SCREENING COUNSELING
    preScreeningCounselingDate: "",
    preScreeningCounselor: "",
    preScreeningConsent: "",
    
    // SCREENING OUTCOME (COMES FIRST)
    screeningResult: "",
    screeningDate: "",
    
    // POST-SCREENING COUNSELING
    postScreeningCounselingDate: "",
    postScreeningCounselor: "",
    
    // FOLLOW-UP for Negative Results
    nextFollowUpDate: "",
    followUpEstablished: "",
    
    // DIAGNOSIS & STAGING (Only if screening positive)
    diagnosis: "",
    cancerType: "",
    cancerStage: "",
    stagingComments: "", // NEW FIELD - Required comments/remarks for staging
    diagnosisDate: "",
    
    // TREATMENT COMMENCEMENT
    treatmentCommenced: "",
    treatmentCommencementDate: "",
    treatmentDelayReason: "",
    
    // TREATMENT DETAILS
    treatmentType: "",
    treatmentFacility: "",
    
    // ADHERENCE TO TREATMENT (BEFORE COMPLETION)
    adherenceRating: "",
    missedAppointments: "",
    missedAppointmentReasons: [] as string[],
    adherenceInterventions: [] as string[],
    
    // TREATMENT COMPLETION
    treatmentStatus: "",
    treatmentCompletionDate: "",
    discontinuationReason: "",
    treatmentDuration: "",
    
    // TREATMENT OUTCOME (AFTER COMPLETION)
    clinicalOutcome: "",
    outcomeAssessmentDate: "",
    
    // GENERAL
    remarks: "",
  });

  function setField(name: string, value: any) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function toggleArrayValue(field: 'missedAppointmentReasons' | 'adherenceInterventions', value: string) {
    setForm(prev => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  }

  async function fetchData() {
    if (!clientId) {
      console.log("No clientId provided");
      setLoading(false);
      return;
    }

    console.log("Fetching data for clientId:", clientId);
    setLoading(true);

    try {
      const [clientRes, outcomeRes] = await Promise.all([
        api.get(`/clients/${clientId}`),
        api.get(`/clients/${clientId}/outcome`).catch(() => null),
      ]);

      console.log("Client response:", clientRes.data);
      console.log("Outcome response:", outcomeRes?.data);

      const rawClient = clientRes.data?.client || clientRes.data?.data;
      setClient({
        clientId: rawClient?.clientId ?? rawClient?.id,
        fullName: rawClient?.fullName ?? rawClient?.full_name ?? "",
        phoneNumber: rawClient?.phoneNumber ?? rawClient?.phone_number ?? "",
      });

      const rawOutcome =
        outcomeRes?.data?.outcome ||
        outcomeRes?.data?.caseOutcome ||
        outcomeRes?.data?.data;

      console.log("Parsed outcome:", rawOutcome);

      if (rawOutcome) {
        setForm({
          // Pre-screening
          preScreeningCounselingDate: rawOutcome.preScreeningCounselingDate ?? rawOutcome.pre_screening_counseling_date ?? "",
          preScreeningCounselor: rawOutcome.preScreeningCounselor ?? rawOutcome.pre_screening_counselor ?? "",
          preScreeningConsent: rawOutcome.preScreeningConsent ?? rawOutcome.pre_screening_consent ?? "",
          
          // Screening outcome
          screeningResult: rawOutcome.screeningResult ?? rawOutcome.screening_result ?? "",
          screeningDate: rawOutcome.screeningDate ?? rawOutcome.screening_date ?? "",
          
          // Post-screening
          postScreeningCounselingDate: rawOutcome.postScreeningCounselingDate ?? rawOutcome.post_screening_counseling_date ?? "",
          postScreeningCounselor: rawOutcome.postScreeningCounselor ?? rawOutcome.post_screening_counselor ?? "",
          
          // Follow-up
          nextFollowUpDate: rawOutcome.nextFollowUpDate ?? rawOutcome.next_follow_up_date ?? "",
          followUpEstablished: rawOutcome.followUpEstablished ?? rawOutcome.follow_up_established ?? "",
          
          // Diagnosis
          diagnosis: rawOutcome.diagnosis ?? "",
          cancerType: rawOutcome.cancerType ?? rawOutcome.cancer_type ?? "",
          cancerStage: rawOutcome.cancerStage ?? rawOutcome.cancer_stage ?? "",
          stagingComments: rawOutcome.stagingComments ?? rawOutcome.staging_comments ?? "",
          diagnosisDate: rawOutcome.diagnosisDate ?? rawOutcome.diagnosis_date ?? "",
          
          // Treatment commencement
          treatmentCommenced: rawOutcome.treatmentCommenced ?? rawOutcome.treatment_commenced ?? "",
          treatmentCommencementDate: rawOutcome.treatmentCommencementDate ?? rawOutcome.treatment_commencement_date ?? "",
          treatmentDelayReason: rawOutcome.treatmentDelayReason ?? rawOutcome.treatment_delay_reason ?? "",
          
          // Treatment details
          treatmentType: rawOutcome.treatmentType ?? rawOutcome.treatment_type ?? "",
          treatmentFacility: rawOutcome.treatmentFacility ?? rawOutcome.treatment_facility ?? "",
          
          // Adherence
          adherenceRating: rawOutcome.adherenceRating ?? rawOutcome.adherence_rating ?? "",
          missedAppointments: rawOutcome.missedAppointments ?? rawOutcome.missed_appointments ?? "",
          missedAppointmentReasons: rawOutcome.missedAppointmentReasons ?? rawOutcome.missed_appointment_reasons ?? [],
          adherenceInterventions: rawOutcome.adherenceInterventions ?? rawOutcome.adherence_interventions ?? [],
          
          // Treatment completion
          treatmentStatus: rawOutcome.treatmentStatus ?? rawOutcome.treatment_status ?? "",
          treatmentCompletionDate: rawOutcome.treatmentCompletionDate ?? rawOutcome.treatment_completion_date ?? "",
          discontinuationReason: rawOutcome.discontinuationReason ?? rawOutcome.discontinuation_reason ?? "",
          treatmentDuration: rawOutcome.treatmentDuration ?? rawOutcome.treatment_duration ?? "",
          
          // Outcome
          clinicalOutcome: rawOutcome.clinicalOutcome ?? rawOutcome.clinical_outcome ?? "",
          outcomeAssessmentDate: rawOutcome.outcomeAssessmentDate ?? rawOutcome.outcome_assessment_date ?? "",
          
          remarks: rawOutcome.remarks ?? "",
        });
      }

      console.log("Data fetch completed successfully");
    } catch (err: any) {
      console.error("Error loading outcome:", err);
      console.error("Error response:", err?.response?.data);
      toast.error(err?.response?.data?.message || "Unable to load outcome.");
    } finally {
      setLoading(false);
      console.log("Loading state set to false");
    }
  }

  useEffect(() => {
    fetchData();
  }, [clientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
 
    setSubmitting(true);
    setServerError("");
 
    try {
      // Prepare payload with backend compatibility
      const payload = {
        ...form,
        // Backend required fields - automatically derived from new workflow
        cancerConfirmed: form.screeningResult === "positive" ? "yes" : "no",
        linkageToTreatment: form.treatmentCommenced === "yes" ? "yes" : "no",
        treatmentCompleted: form.treatmentStatus === "completed" ? "yes" : 
                           form.treatmentStatus === "discontinued" ? "no" : "ongoing",
      };
 
      await api.put(`/clients/${clientId}/outcome`, payload);
      toast.success("Case outcome saved successfully.");
      router.push(`/ncsr/client-details?clientId=${clientId}`);
    } catch (err: any) {
      const response = err?.response?.data;
 
      if (response?.errors) {
        const mapped: Record<string, string> = {};
        Object.keys(response.errors).forEach((key) => {
          if (
            Array.isArray(response.errors[key]) &&
            response.errors[key].length > 0
          ) {
            mapped[key] = response.errors[key][0];
          }
        });
        setErrors(mapped);
      }
 
      const message = response?.message || "Unable to save case outcome.";
      setServerError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }
 
  if (loading) {
    return (
      <Layout>
        <PageTitle>Case Outcome</PageTitle>
        <div className="mt-6 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Loading case outcome...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <PageTitle>Case Outcome</PageTitle>
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          Client not found. Please ensure you have accessed this page from a valid client record.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>Case Outcome</PageTitle>

        <div className="mt-4 overflow-hidden rounded-3xl bg-gradient-to-r from-green-900 via-green-800 to-green-700 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                  National Cancer Screening Register
                </div>

                <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                  Complete Screening Journey for {client?.fullName || "client"}
                </h2>

                <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
                  {/* NEW WORKFLOW: Pre-screening counseling → Screening outcome → Post-screening counseling → Diagnosis/Staging (if positive) → Treatment journey with adherence tracking → Treatment outcome */}
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm text-green-100">
                  <span>Clients</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>{client?.fullName || "Client"}</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>Outcome</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {serverError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          {serverError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Client Summary */}
        <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
            <SectionTitle>Client Summary</SectionTitle>
          </div>

          <div className="px-5 py-6 sm:px-6">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <UserRound className="w-4 h-4" />
                Selected Client
              </div>
              <p className="mt-2 font-semibold text-gray-800 dark:text-gray-100">
                {client?.fullName || "—"}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {client?.phoneNumber || "No phone number"}
              </p>
            </div>
          </div>
        </div>

        {/* 1. PRE-SCREENING COUNSELING */}
        <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-blue-50/70 dark:bg-blue-900/20">
            <SectionTitle>1. Pre-Screening Counseling</SectionTitle>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Counseling must be completed before screening
            </p>
          </div>

          <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
            <Label>
              <span className="text-sm font-semibold">Counseling Date</span>
              <Input
                className="mt-2 rounded-2xl h-12 shadow-sm"
                type="date"
                value={form.preScreeningCounselingDate}
                onChange={(e) => setField("preScreeningCounselingDate", e.target.value)}
              />
            </Label>

            <Label>
              <span className="text-sm font-semibold">Counselor Name/ID</span>
              <Input
                className="mt-2 rounded-2xl h-12 shadow-sm"
                value={form.preScreeningCounselor}
                onChange={(e) => setField("preScreeningCounselor", e.target.value)}
                placeholder="Enter counselor name"
              />
            </Label>

            <Label className="md:col-span-2">
              <span className="text-sm font-semibold">Consent Obtained</span>
              <Select
                className="mt-2 rounded-2xl h-12 shadow-sm"
                value={form.preScreeningConsent}
                onChange={(e) => setField("preScreeningConsent", e.target.value)}
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </Label>
          </div>
        </div>

        {/* 2. SCREENING OUTCOME - MOVED UP (BEFORE DIAGNOSIS) */}
        <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-purple-50/70 dark:bg-purple-900/20">
            <SectionTitle>2. Screening Outcome</SectionTitle>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {/* This now comes BEFORE diagnosis and staging */}
            </p>
          </div>

          <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
            <Label>
              <span className="text-sm font-semibold">Screening Result</span>
              <Select
                className="mt-2 rounded-2xl h-12 shadow-sm"
                value={form.screeningResult}
                onChange={(e) => setField("screeningResult", e.target.value)}
              >
                <option value="">Select</option>
                <option value="negative">Screening Negative</option>
                <option value="positive">Screening Positive</option>
                <option value="inconclusive">Inconclusive / Requires Repeat</option>
              </Select>
            </Label>

            <Label>
              <span className="text-sm font-semibold">Screening Date</span>
              <Input
                className="mt-2 rounded-2xl h-12 shadow-sm"
                type="date"
                value={form.screeningDate}
                onChange={(e) => setField("screeningDate", e.target.value)}
              />
            </Label>
          </div>
        </div>

        {/* 3. POST-SCREENING COUNSELING */}
        <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-blue-50/70 dark:bg-blue-900/20">
            <SectionTitle>3. Post-Screening Counseling</SectionTitle>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {/* For both positive and negative results */}
            </p>
          </div>

          <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
            <Label>
              <span className="text-sm font-semibold">Counseling Date</span>
              <Input
                className="mt-2 rounded-2xl h-12 shadow-sm"
                type="date"
                value={form.postScreeningCounselingDate}
                onChange={(e) => setField("postScreeningCounselingDate", e.target.value)}
              />
            </Label>

            <Label>
              <span className="text-sm font-semibold">Counselor Name/ID</span>
              <Input
                className="mt-2 rounded-2xl h-12 shadow-sm"
                value={form.postScreeningCounselor}
                onChange={(e) => setField("postScreeningCounselor", e.target.value)}
                placeholder="Enter counselor name"
              />
            </Label>
          </div>
        </div>

        {/* 4. FOLLOW-UP (For Negative Screening) */}
        {form.screeningResult === "negative" && (
          <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-green-50/70 dark:bg-green-900/20">
              <SectionTitle>4. Follow-up (For Negative Screening)</SectionTitle>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                AUTOMATIC: System schedules 6-month follow-up
              </p>
            </div>

            <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
              <Label>
                <span className="text-sm font-semibold">Next Follow-up Date (Automatic - 6 months)</span>
                <Input
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  type="date"
                  value={form.nextFollowUpDate}
                  onChange={(e) => setField("nextFollowUpDate", e.target.value)}
                />
                <HelperText>System auto-calculates 6 months from screening date</HelperText>
              </Label>

              <Label>
                <span className="text-sm font-semibold">Follow-up Established</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.followUpEstablished}
                  onChange={(e) => setField("followUpEstablished", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </Label>
            </div>
          </div>
        )}

        {/* 5. DIAGNOSIS & STAGING (Only if screening positive) */}
        {form.screeningResult === "positive" && (
          <>
            <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-orange-50/70 dark:bg-orange-900/20">
                <SectionTitle>5. Diagnosis & Staging (Only for Positive Screening)</SectionTitle>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  With comments/remarks field for staging details
                </p>
              </div>

              <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
                <Label>
                  <span className="text-sm font-semibold">Diagnosis</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.diagnosis}
                    onChange={(e) => setField("diagnosis", e.target.value)}
                    placeholder="Enter diagnosis"
                  />
                </Label>

                <Label>
                  <span className="text-sm font-semibold">Cancer Type</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.cancerType}
                    onChange={(e) => setField("cancerType", e.target.value)}
                  >
                    <option value="">Select cancer type</option>
                    <option value="cervical">Cervical</option>
                    <option value="breast">Breast</option>
                    <option value="prostate">Prostate</option>
                    <option value="colorectal">Colorectal</option>
                    <option value="liver">Liver</option>
                    <option value="skin">Skin (NEW)</option>
                  </Select>
                </Label>

                <Label>
                  <span className="text-sm font-semibold">Cancer Stage</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.cancerStage}
                    onChange={(e) => setField("cancerStage", e.target.value)}
                  >
                    <option value="">Select stage</option>
                    <option value="stage_0">Stage 0</option>
                    <option value="stage_1">Stage 1</option>
                    <option value="stage_2">Stage 2</option>
                    <option value="stage_3">Stage 3</option>
                    <option value="stage_4">Stage 4</option>
                  </Select>
                </Label>

                <Label>
                  <span className="text-sm font-semibold">Diagnosis Date</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    type="date"
                    value={form.diagnosisDate}
                    onChange={(e) => setField("diagnosisDate", e.target.value)}
                  />
                </Label>

                <Label className="md:col-span-2">
                  <span className="text-sm font-semibold">Staging Comments / Remarks</span>
                  <Textarea
                    className="mt-2 rounded-2xl shadow-sm"
                    rows={4}
                    value={form.stagingComments}
                    onChange={(e) => setField("stagingComments", e.target.value)}
                    placeholder="Enter detailed clinical notes about staging..."
                  />
                  <HelperText>Important field for clinicians to add staging details</HelperText>
                </Label>
              </div>
            </div>

            {/* 6. TREATMENT COMMENCEMENT */}
            <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-red-50/70 dark:bg-red-900/20">
                <SectionTitle>6. Treatment Commencement</SectionTitle>
              </div>

              <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
                <Label>
                  <span className="text-sm font-semibold">Treatment Commenced?</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.treatmentCommenced}
                    onChange={(e) => setField("treatmentCommenced", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </Select>
                </Label>

                {form.treatmentCommenced === "yes" && (
                  <Label>
                    <span className="text-sm font-semibold">Commencement Date</span>
                    <Input
                      className="mt-2 rounded-2xl h-12 shadow-sm"
                      type="date"
                      value={form.treatmentCommencementDate}
                      onChange={(e) => setField("treatmentCommencementDate", e.target.value)}
                    />
                  </Label>
                )}

                {form.treatmentCommenced === "no" && (
                  <Label className="md:col-span-2">
                    <span className="text-sm font-semibold">Reason for Delay</span>
                    <Select
                      className="mt-2 rounded-2xl h-12 shadow-sm"
                      value={form.treatmentDelayReason}
                      onChange={(e) => setField("treatmentDelayReason", e.target.value)}
                    >
                      <option value="">Select reason</option>
                      <option value="patient_choice">Patient Choice</option>
                      <option value="financial_constraints">Financial Constraints</option>
                      <option value="medical_contraindications">Medical Contraindications</option>
                      <option value="waiting_facility">Waiting for Facility/Appointment</option>
                      <option value="other">Other</option>
                    </Select>
                  </Label>
                )}
              </div>
            </div>

            {/* 7. TREATMENT DETAILS */}
            <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
                <SectionTitle>7. Treatment Details</SectionTitle>
              </div>

              <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
                <Label>
                  <span className="text-sm font-semibold">Treatment Type</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.treatmentType}
                    onChange={(e) => setField("treatmentType", e.target.value)}
                  >
                    <option value="">Select treatment type</option>
                    <option value="surgery">Surgery</option>
                    <option value="chemotherapy">Chemotherapy</option>
                    <option value="radiotherapy">Radiotherapy</option>
                    <option value="hormonal">Hormonal Therapy</option>
                    <option value="immunotherapy">Immunotherapy</option>
                    <option value="combination">Combination Therapy</option>
                    <option value="other">Other</option>
                  </Select>
                </Label>

                <Label>
                  <span className="text-sm font-semibold">Treatment Facility</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.treatmentFacility}
                    onChange={(e) => setField("treatmentFacility", e.target.value)}
                    placeholder="Enter treatment facility"
                  />
                </Label>
              </div>
            </div>

            {/* 8. ADHERENCE TO TREATMENT SCHEDULE (BEFORE COMPLETION) */}
            <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-yellow-50/70 dark:bg-yellow-900/20">
                <SectionTitle>8. Adherence to Treatment Schedule </SectionTitle>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {/* This comes BEFORE treatment completion status */}
                </p>
              </div>

              <div className="px-5 py-6 sm:px-6 space-y-5">
                <Label>
                  <span className="text-sm font-semibold">Overall Adherence Rating</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.adherenceRating}
                    onChange={(e) => setField("adherenceRating", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="excellent">Excellent (90% adherence)</option>
                    <option value="good">Good (75-90% adherence)</option>
                    <option value="fair">Fair (50-74% adherence)</option>
                    <option value="poor">Poor (50% adherence)</option>
                  </Select>
                </Label>

                <Label>
                  <span className="text-sm font-semibold">Number of Missed Appointments</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    type="number"
                    min="0"
                    value={form.missedAppointments}
                    onChange={(e) => setField("missedAppointments", e.target.value)}
                    placeholder="Enter number"
                  />
                </Label>

                {parseInt(form.missedAppointments) > 0 && (
                  <>
                    <div>
                      <span className="text-sm font-semibold block mb-3">Reasons for Missed Appointments (Select all that apply)</span>
                      <div className="grid gap-2 md:grid-cols-2">
                        {['financial', 'transportation', 'side_effects', 'feeling_better', 'lost_to_followup', 'other'].map((reason) => (
                          <Label key={reason} check>
                            <Input
                              type="checkbox"
                              checked={form.missedAppointmentReasons.includes(reason)}
                              onChange={() => toggleArrayValue('missedAppointmentReasons', reason)}
                            />
                            <span className="ml-2 capitalize">{reason.replace(/_/g, ' ')}</span>
                          </Label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-semibold block mb-3">Interventions Provided (Select all that apply)</span>
                      <div className="grid gap-2 md:grid-cols-2">
                        {['counseling', 'financial_support', 'transportation_assistance', 'side_effect_management', 'other'].map((intervention) => (
                          <Label key={intervention} check>
                            <Input
                              type="checkbox"
                              checked={form.adherenceInterventions.includes(intervention)}
                              onChange={() => toggleArrayValue('adherenceInterventions', intervention)}
                            />
                            <span className="ml-2 capitalize">{intervention.replace(/_/g, ' ')}</span>
                          </Label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 9. TREATMENT COMPLETION STATUS */}
            <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
                <SectionTitle>9. Treatment Completion Status</SectionTitle>
              </div>

              <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
                <Label className="md:col-span-2">
                  <span className="text-sm font-semibold">Treatment Status</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.treatmentStatus}
                    onChange={(e) => setField("treatmentStatus", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="completed">Treatment Completed</option>
                    <option value="in_progress_on_schedule">Treatment In Progress (On Schedule)</option>
                    <option value="in_progress_behind">Treatment In Progress (Behind Schedule)</option>
                    <option value="discontinued">Treatment Discontinued</option>
                  </Select>
                </Label>

                {form.treatmentStatus === "completed" && (
                  <>
                    <Label>
                      <span className="text-sm font-semibold">Completion Date</span>
                      <Input
                        className="mt-2 rounded-2xl h-12 shadow-sm"
                        type="date"
                        value={form.treatmentCompletionDate}
                        onChange={(e) => setField("treatmentCompletionDate", e.target.value)}
                      />
                    </Label>

                    <Label>
                      <span className="text-sm font-semibold">Total Duration (months)</span>
                      <Input
                        className="mt-2 rounded-2xl h-12 shadow-sm"
                        value={form.treatmentDuration}
                        onChange={(e) => setField("treatmentDuration", e.target.value)}
                        placeholder="Enter duration"
                      />
                    </Label>
                  </>
                )}

                {form.treatmentStatus === "discontinued" && (
                  <Label className="md:col-span-2">
                    <span className="text-sm font-semibold">Reason for Discontinuation</span>
                    <Select
                      className="mt-2 rounded-2xl h-12 shadow-sm"
                      value={form.discontinuationReason}
                      onChange={(e) => setField("discontinuationReason", e.target.value)}
                    >
                      <option value="">Select reason</option>
                      <option value="medical_reasons">Medical Reasons</option>
                      <option value="patient_choice">Patient Choice</option>
                      <option value="side_effects">Side Effects</option>
                      <option value="financial_constraints">Financial Constraints</option>
                      <option value="lost_to_followup">Lost to Follow-up</option>
                      <option value="death">Death</option>
                      <option value="other">Other</option>
                    </Select>
                  </Label>
                )}
              </div>
            </div>

            {/* 10. TREATMENT OUTCOME (AFTER COMPLETION) */}
            <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-teal-50/70 dark:bg-teal-900/20">
                <SectionTitle>10. Treatment Outcome</SectionTitle>
              </div>

              <div className="px-5 py-6 sm:px-6 grid gap-5 md:grid-cols-2">
                <Label>
                  <span className="text-sm font-semibold">Clinical Outcome</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.clinicalOutcome}
                    onChange={(e) => setField("clinicalOutcome", e.target.value)}
                  >
                    <option value="">Select outcome</option>
                    <option value="complete_remission">Complete Remission</option>
                    <option value="partial_remission">Partial Remission</option>
                    <option value="stable_disease">Stable Disease</option>
                    <option value="progressive_disease">Progressive Disease</option>
                    <option value="recurrence">Recurrence</option>
                    <option value="death">Death</option>
                  </Select>
                </Label>

                <Label>
                  <span className="text-sm font-semibold">Outcome Assessment Date</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    type="date"
                    value={form.outcomeAssessmentDate}
                    onChange={(e) => setField("outcomeAssessmentDate", e.target.value)}
                  />
                </Label>
              </div>
            </div>
          </>
        )}

        {/* REMARKS */}
        <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-700 px-5 py-4 sm:px-6 bg-gray-50/70 dark:bg-gray-800/60">
            <SectionTitle>Additional Remarks</SectionTitle>
          </div>

          <div className="px-5 py-6 sm:px-6">
            <Label>
              <span className="text-sm font-semibold">General Remarks</span>
              <Textarea
                className="mt-2 rounded-2xl shadow-sm"
                rows={5}
                value={form.remarks}
                onChange={(e) => setField("remarks", e.target.value)}
                placeholder="Enter any additional remarks..."
              />
            </Label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 z-10">
          <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-xl px-4 py-4 sm:px-6">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                layout="outline"
                type="button"
                className="rounded-2xl h-11"
                onClick={() => router.push(`/ncsr/client-details?clientId=${clientId}`)}
              >
                Back to Client
              </Button>

              <Button
                type="submit"
                className="rounded-2xl h-11 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
                disabled={submitting}
              >
                <span className="inline-flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Saving..." : "Save Complete Outcome"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Layout>
  );
}