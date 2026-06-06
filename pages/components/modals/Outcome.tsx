import React, { useState, useEffect } from "react";
import {
  Button,
  Label,
  Input,
  Select,
  Textarea,
  HelperText,
} from "@roketid/windmill-react-ui";
import { Loader2, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../../lib/api";

type OutcomeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
  existingOutcome?: any;
  onComplete: () => void;
};

const STEPS = [
  { id: 1, title: "Pre-Screening Counseling" },
  { id: 2, title: "Screening Outcome" },
  { id: 3, title: "Post-Screening Counseling" },
  { id: 4, title: "Follow-up / Diagnosis" },
  { id: 5, title: "Treatment" },
  { id: 6, title: "Adherence & Outcome" },
];

const today = () => new Date().toISOString().split("T")[0];
// <input type="date"> needs YYYY-MM-DD; strip any ISO time component.
const dateOnly = (v?: string | null) => (v ? String(v).split("T")[0] : "");

export default function OutcomeModal({
  isOpen,
  onClose,
  clientId,
  existingOutcome,
  onComplete,
}: OutcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);

  const [form, setForm] = useState({
    preScreeningCounselingDate: "",
    preScreeningCounselor: "",
    preScreeningConsent: "",

    screeningResult: "",
    screeningDate: today(),

    postScreeningCounselingDate: "",
    postScreeningCounselor: "",

    nextFollowUpDate: "",
    followUpEstablished: "",

    diagnosis: "",
    cancerType: "",
    cancerStage: "",
    stagingComments: "",
    diagnosisDate: "",

    treatmentCommenced: "",
    treatmentCommencementDate: "",
    treatmentDelayReason: "",

    treatmentType: "",
    treatmentFacility: "",

    adherenceRating: "",
    missedAppointments: "",
    missedAppointmentReasons: [] as string[],
    adherenceInterventions: [] as string[],

    treatmentStatus: "",
    treatmentCompletionDate: "",
    discontinuationReason: "",
    treatmentDuration: "",

    clinicalOutcome: "",
    outcomeAssessmentDate: "",

    remarks: "",
  });

  useEffect(() => {
    if (!existingOutcome) return;
    const o = existingOutcome;
    setForm({
      preScreeningCounselingDate: dateOnly(
        o.preScreeningCounselingDate ?? o.pre_screening_counseling_date
      ),
      preScreeningCounselor:
        o.preScreeningCounselor ?? o.pre_screening_counselor ?? "",
      preScreeningConsent:
        o.preScreeningConsent ?? o.pre_screening_consent ?? "",

      screeningResult: o.screeningResult ?? o.screening_result ?? "",
      screeningDate:
        dateOnly(o.screeningDate ?? o.screening_date) || today(),

      postScreeningCounselingDate: dateOnly(
        o.postScreeningCounselingDate ?? o.post_screening_counseling_date
      ),
      postScreeningCounselor:
        o.postScreeningCounselor ?? o.post_screening_counselor ?? "",

      nextFollowUpDate: dateOnly(o.nextFollowUpDate ?? o.next_follow_up_date),
      followUpEstablished:
        o.followUpEstablished ?? o.follow_up_established ?? "",

      diagnosis: o.diagnosis ?? "",
      cancerType: o.cancerType ?? o.cancer_type ?? "",
      cancerStage: o.cancerStage ?? o.cancer_stage ?? "",
      stagingComments: o.stagingComments ?? o.staging_comments ?? "",
      diagnosisDate: dateOnly(o.diagnosisDate ?? o.diagnosis_date),

      treatmentCommenced: o.treatmentCommenced ?? o.treatment_commenced ?? "",
      treatmentCommencementDate: dateOnly(
        o.treatmentCommencementDate ?? o.treatment_commencement_date
      ),
      treatmentDelayReason:
        o.treatmentDelayReason ?? o.treatment_delay_reason ?? "",

      treatmentType: o.treatmentType ?? o.treatment_type ?? "",
      treatmentFacility: o.treatmentFacility ?? o.treatment_facility ?? "",

      adherenceRating: o.adherenceRating ?? o.adherence_rating ?? "",
      missedAppointments: num(o.missedAppointments ?? o.missed_appointments),
      missedAppointmentReasons:
        o.missedAppointmentReasons ?? o.missed_appointment_reasons ?? [],
      adherenceInterventions:
        o.adherenceInterventions ?? o.adherence_interventions ?? [],

      treatmentStatus: o.treatmentStatus ?? o.treatment_status ?? "",
      treatmentCompletionDate: dateOnly(
        o.treatmentCompletionDate ?? o.treatment_completion_date
      ),
      discontinuationReason:
        o.discontinuationReason ?? o.discontinuation_reason ?? "",
      treatmentDuration: num(o.treatmentDuration ?? o.treatment_duration),

      clinicalOutcome: o.clinicalOutcome ?? o.clinical_outcome ?? "",
      outcomeAssessmentDate: dateOnly(
        o.outcomeAssessmentDate ?? o.outcome_assessment_date
      ),

      remarks: o.remarks ?? "",
    });
  }, [existingOutcome]);

  useEffect(() => {
    async function fetchFacilities() {
      setLoadingFacilities(true);
      try {
        const response = await api.get("/facilities");
        const facilitiesData =
          response.data?.facilities || response.data?.data || response.data || [];
        const treatmentFacilities = facilitiesData.filter(
          (facility: any) => facility.isTreatmentCenter === true
        );
        setFacilities(treatmentFacilities);
      } catch (err) {
        toast.error("Unable to load treatment facilities");
        setFacilities([]);
      } finally {
        setLoadingFacilities(false);
      }
    }
    fetchFacilities();
  }, []);

  // Auto-calculate follow-up date (6 months from screening) for negatives.
  useEffect(() => {
    if (form.screeningDate && form.screeningResult === "negative" && !form.nextFollowUpDate) {
      const d = new Date(form.screeningDate);
      d.setMonth(d.getMonth() + 6);
      setForm((prev) => ({ ...prev, nextFollowUpDate: d.toISOString().split("T")[0] }));
    }
  }, [form.screeningDate, form.screeningResult]);

  function setField(name: string, value: any) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function toggleArrayValue(field: keyof typeof form, value: string) {
    setForm((prev) => {
      const current = prev[field] as string[];
      return current.includes(value)
        ? { ...prev, [field]: current.filter((v) => v !== value) }
        : { ...prev, [field]: [...current, value] };
    });
  }

  function handleNext() {
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  }
  function handlePrevious() {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        missedAppointments: form.missedAppointments ? parseInt(form.missedAppointments) : null,
        cancerConfirmed: form.screeningResult === "positive" ? "yes" : "no",
        linkageToTreatment: form.treatmentCommenced === "yes" ? "yes" : "no",
        treatmentCompleted:
          form.treatmentStatus === "completed"
            ? "yes"
            : form.treatmentStatus === "discontinued"
            ? "no"
            : "ongoing",
      };

      await api.put(`/clients/${clientId}/outcome`, payload);
      toast.success("Outcome saved successfully.");
      onComplete();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to save outcome.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (!submitting) {
      setCurrentStep(1);
      setErrors({});
      onClose();
    }
  }

  if (!isOpen) return null;

  const facilityNames = facilities.map((f) => f.facilityName || f.name);
  const facilityNotInList =
    form.treatmentFacility && !facilityNames.includes(form.treatmentFacility);

  function renderStep() {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Pre-screening counseling must be completed before screening begins.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="rounded-2xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4">
              <p className="text-sm text-purple-800 dark:text-purple-200">
                Record the screening outcome. This determines the next steps in the workflow.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Label>
                <span className="text-sm font-semibold">Screening Result</span>
                <Select
                  className="mt-2 rounded-2xl h-12 shadow-sm"
                  value={form.screeningResult}
                  onChange={(e) => setField("screeningResult", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="negative">Negative</option>
                  <option value="positive">Positive</option>
                  <option value="inconclusive">Inconclusive</option>
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
                <HelperText>Defaults to today&apos;s date</HelperText>
              </Label>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Post-screening counseling for both positive and negative results.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
        );

      case 4:
        if (form.screeningResult === "negative") {
          return (
            <div className="space-y-4">
              <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Negative Result:</strong> Schedule 6-month follow-up screening.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Label>
                  <span className="text-sm font-semibold">Next Follow-up Date (Auto: +6 months)</span>
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
          );
        } else if (form.screeningResult === "positive") {
          return (
            <div className="space-y-4">
              <div className="rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Positive Result:</strong> Record diagnosis and staging details.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                    <option value="">Select</option>
                    <option value="cervical">Cervical</option>
                    <option value="breast">Breast</option>
                    <option value="prostate">Prostate</option>
                    <option value="colorectal">Colorectal</option>
                    <option value="liver">Liver</option>
                    <option value="skin">Skin</option>
                  </Select>
                </Label>

                <Label>
                  <span className="text-sm font-semibold">Cancer Stage</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.cancerStage}
                    onChange={(e) => setField("cancerStage", e.target.value)}
                  >
                    <option value="">Select</option>
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
                  <span className="text-sm font-semibold">Staging Comments / Clinical Notes</span>
                  <Textarea
                    className="mt-2 rounded-2xl shadow-sm"
                    rows={4}
                    value={form.stagingComments}
                    onChange={(e) => setField("stagingComments", e.target.value)}
                    placeholder="Enter detailed clinical notes about staging..."
                  />
                </Label>
              </div>
            </div>
          );
        } else {
          return (
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Please select a screening result in Step 2 to continue.
              </p>
            </div>
          );
        }

      case 5:
        if (form.screeningResult !== "positive") {
          return (
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Treatment steps are only applicable for positive screening results.
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                Treatment Commencement
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
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
                      <option value="waiting_facility">Waiting for Facility</option>
                      <option value="other">Other</option>
                    </Select>
                  </Label>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                Treatment Details
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Label>
                  <span className="text-sm font-semibold">Treatment Type</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.treatmentType}
                    onChange={(e) => setField("treatmentType", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="surgery">Surgery</option>
                    <option value="chemotherapy">Chemotherapy</option>
                    <option value="radiotherapy">Radiotherapy</option>
                    <option value="brachytherapy">Brachytherapy</option>
                    <option value="hormonal">Hormonal Therapy</option>
                    <option value="immunotherapy">Immunotherapy</option>
                    <option value="combination">Combination Therapy</option>
                    <option value="other">Other</option>
                  </Select>
                </Label>

                <Label>
                  <span className="text-sm font-semibold">Treatment Facility</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.treatmentFacility}
                    onChange={(e) => setField("treatmentFacility", e.target.value)}
                    disabled={loadingFacilities}
                  >
                    <option value="">
                      {loadingFacilities
                        ? "Loading treatment facilities..."
                        : facilities.length === 0
                        ? "No treatment facilities available"
                        : "Select treatment facility"}
                    </option>
                    {/* Keep a saved facility visible even if it's not in the loaded list */}
                    {facilityNotInList && (
                      <option value={form.treatmentFacility}>{form.treatmentFacility}</option>
                    )}
                    {facilities.map((facility) => (
                      <option
                        key={facility.id || facility.facilityId}
                        value={facility.facilityName || facility.name}
                      >
                        {facility.facilityName || facility.name}
                        {facility.facilityCode ? ` - ${facility.facilityCode}` : ""}
                      </option>
                    ))}
                  </Select>
                </Label>
              </div>
            </div>
          </div>
        );

      case 6:
        if (form.screeningResult !== "positive") {
          return (
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Adherence and outcome tracking are only applicable for positive screening results.
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                Adherence to Treatment Schedule
              </h3>
              <div className="space-y-4">
                <Label>
                  <span className="text-sm font-semibold">Overall Adherence Rating</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.adherenceRating}
                    onChange={(e) => setField("adherenceRating", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="excellent">Excellent (≥90%)</option>
                    <option value="good">Good (75-89%)</option>
                    <option value="fair">Fair (50-74%)</option>
                    <option value="poor">Poor (&lt;50%)</option>
                  </Select>
                </Label>

                <Label>
                  <span className="text-sm font-semibold">Missed Appointments</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    type="number"
                    min="0"
                    value={form.missedAppointments}
                    onChange={(e) => setField("missedAppointments", e.target.value)}
                    placeholder="Number of missed appointments"
                  />
                </Label>

                {parseInt(form.missedAppointments) > 0 && (
                  <>
                    <div>
                      <span className="text-sm font-semibold block mb-3">
                        Reasons for Missed Appointments (select all)
                      </span>
                      <div className="grid gap-2 md:grid-cols-2">
                        {["financial", "transportation", "side_effects", "feeling_better", "lost_to_followup", "other"].map(
                          (reason) => (
                            <Label key={reason} check>
                              <Input
                                type="checkbox"
                                checked={form.missedAppointmentReasons.includes(reason)}
                                onChange={() => toggleArrayValue("missedAppointmentReasons", reason)}
                              />
                              <span className="ml-2 capitalize">{reason.replace(/_/g, " ")}</span>
                            </Label>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-semibold block mb-3">
                        Interventions Provided (select all)
                      </span>
                      <div className="grid gap-2 md:grid-cols-2">
                        {["counseling", "financial_support", "transportation_assistance", "side_effect_management", "other"].map(
                          (intervention) => (
                            <Label key={intervention} check>
                              <Input
                                type="checkbox"
                                checked={form.adherenceInterventions.includes(intervention)}
                                onChange={() => toggleArrayValue("adherenceInterventions", intervention)}
                              />
                              <span className="ml-2 capitalize">{intervention.replace(/_/g, " ")}</span>
                            </Label>
                          )
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                Treatment Completion Status
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Label className="md:col-span-2">
                  <span className="text-sm font-semibold">Status</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.treatmentStatus}
                    onChange={(e) => setField("treatmentStatus", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="completed">Completed</option>
                    <option value="in_progress_on_schedule">In Progress (On Schedule)</option>
                    <option value="in_progress_behind">In Progress (Behind Schedule)</option>
                    <option value="discontinued">Discontinued</option>
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
                      <span className="text-sm font-semibold">Duration (months)</span>
                      <Input
                        className="mt-2 rounded-2xl h-12 shadow-sm"
                        value={form.treatmentDuration}
                        onChange={(e) => setField("treatmentDuration", e.target.value)}
                        placeholder="Total duration"
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
                      <option value="">Select</option>
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

            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                Clinical Outcome
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Label>
                  <span className="text-sm font-semibold">Outcome</span>
                  <Select
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    value={form.clinicalOutcome}
                    onChange={(e) => setField("clinicalOutcome", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="complete_remission">Complete Remission</option>
                    <option value="partial_remission">Partial Remission</option>
                    <option value="stable_disease">Stable Disease</option>
                    <option value="progressive_disease">Progressive Disease</option>
                    <option value="recurrence">Recurrence</option>
                    <option value="death">Death</option>
                  </Select>
                </Label>

                <Label>
                  <span className="text-sm font-semibold">Assessment Date</span>
                  <Input
                    className="mt-2 rounded-2xl h-12 shadow-sm"
                    type="date"
                    value={form.outcomeAssessmentDate}
                    onChange={(e) => setField("outcomeAssessmentDate", e.target.value)}
                  />
                </Label>

                <Label className="md:col-span-2">
                  <span className="text-sm font-semibold">General Remarks</span>
                  <Textarea
                    className="mt-2 rounded-2xl shadow-sm"
                    rows={4}
                    value={form.remarks}
                    onChange={(e) => setField("remarks", e.target.value)}
                    placeholder="Any additional notes or observations..."
                  />
                </Label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Case Outcome - Step {currentStep} of {STEPS.length}
            </h3>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                {STEPS.map((step, idx) => (
                  <div key={step.id} className={`flex-1 ${idx < STEPS.length - 1 ? "mr-2" : ""}`}>
                    <div
                      className={`h-2 rounded-full ${
                        step.id <= currentStep ? "bg-green-600" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                    <p
                      className={`mt-2 text-xs text-center hidden sm:block ${
                        step.id === currentStep ? "text-green-600 font-semibold" : "text-gray-500"
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {renderStep()}
          </div>

          <div className="flex gap-3 justify-between p-6 border-t dark:border-gray-700">
            <Button
              layout="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || submitting}
              className="rounded-xl"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-3">
              <Button layout="outline" onClick={handleClose} type="button" disabled={submitting} className="rounded-xl">
                Cancel
              </Button>

              {currentStep < STEPS.length ? (
                <Button onClick={handleNext} disabled={submitting} className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800">
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting} className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800">
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Complete
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// number-or-empty helper (kept at bottom to mirror existing file style)
function num(v: any) {
  return v === null || v === undefined ? "" : String(v);
}