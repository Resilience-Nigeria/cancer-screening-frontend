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
import api from "../../lib/api";

type ScreeningModalProps = {
  isOpen: boolean;
  onClose: () => void;
  visitId: number;
  moduleType: "cervical" | "breast" | "prostate" | "colorectal" | "liver";
  existingData?: any;
  onComplete: () => void;
};

// Field configurations for each screening type
const SCREENING_CONFIGS = {
  cervical: {
    title: "Cervical Screening",
    color: "purple",
    fields: [
      { name: "visualInspection", label: "Visual Inspection with Acetic Acid (VIA)", type: "select", options: ["negative", "positive", "suspicious"] },
      { name: "papSmear", label: "Pap Smear Result", type: "select", options: ["normal", "ascus", "lsil", "hsil", "agc", "cancer"] },
      { name: "hpvTest", label: "HPV Test", type: "select", options: ["negative", "positive", "not_done"] },
      { name: "biopsyResult", label: "Biopsy Result", type: "select", options: ["normal", "cin1", "cin2", "cin3", "invasive_cancer", "not_done"] },
      { name: "lesionLocation", label: "Lesion Location (if any)", type: "text" },
      { name: "lesionSize", label: "Lesion Size (cm)", type: "number" },
      { name: "treatmentGiven", label: "Treatment Given", type: "select", options: ["none", "cryotherapy", "leep", "referral"] },
      { name: "clinicalNotes", label: "Clinical Notes", type: "textarea" },
    ],
  },
  breast: {
    title: "Breast Screening",
    color: "pink",
    fields: [
      { name: "clinicalBreastExam", label: "Clinical Breast Exam (CBE)", type: "select", options: ["normal", "abnormal"] },
      { name: "lumpDetected", label: "Lump Detected", type: "select", options: ["yes", "no"] },
      { name: "lumpLocation", label: "Lump Location", type: "select", options: ["upper_outer", "upper_inner", "lower_outer", "lower_inner", "central", "bilateral"] },
      { name: "lumpSize", label: "Lump Size (cm)", type: "number" },
      { name: "lumpCharacteristics", label: "Lump Characteristics", type: "select", options: ["mobile", "fixed", "tender", "non_tender"] },
      { name: "mammogramResult", label: "Mammogram Result", type: "select", options: ["birads_0", "birads_1", "birads_2", "birads_3", "birads_4", "birads_5", "birads_6", "not_done"] },
      { name: "ultrasoundResult", label: "Ultrasound Result", type: "select", options: ["normal", "benign", "suspicious", "malignant", "not_done"] },
      { name: "biopsyResult", label: "Biopsy Result", type: "select", options: ["benign", "atypical", "dcis", "invasive_cancer", "not_done"] },
      { name: "nippleDischarge", label: "Nipple Discharge", type: "select", options: ["none", "clear", "bloody", "purulent"] },
      { name: "skinChanges", label: "Skin Changes", type: "select", options: ["none", "dimpling", "peau_orange", "ulceration", "erythema"] },
      { name: "clinicalNotes", label: "Clinical Notes", type: "textarea" },
    ],
  },
  prostate: {
    title: "Prostate Screening",
    color: "blue",
    fields: [
      { name: "psaLevel", label: "PSA Level (ng/mL)", type: "number", step: "0.01" },
      { name: "psaInterpretation", label: "PSA Interpretation", type: "select", options: ["normal", "borderline", "elevated", "very_high"] },
      { name: "digitalRectalExam", label: "Digital Rectal Exam (DRE)", type: "select", options: ["normal", "enlarged_smooth", "enlarged_nodular", "suspicious_for_cancer"] },
      { name: "prostateSize", label: "Estimated Prostate Size (grams)", type: "number" },
      { name: "urinarySymptoms", label: "Urinary Symptoms", type: "select", options: ["none", "frequency", "urgency", "weak_stream", "nocturia", "retention"] },
      { name: "biopsyResult", label: "Biopsy Result", type: "select", options: ["negative", "pin", "adenocarcinoma", "not_done"] },
      { name: "gleasonScore", label: "Gleason Score (if cancer)", type: "select", options: ["", "6", "7", "8", "9", "10"] },
      { name: "mriResult", label: "MRI Result", type: "select", options: ["normal", "abnormal", "suspicious", "not_done"] },
      { name: "clinicalNotes", label: "Clinical Notes", type: "textarea" },
    ],
  },
  colorectal: {
    title: "Colorectal Screening",
    color: "orange",
    fields: [
      { name: "fecalOccultBloodTest", label: "Fecal Occult Blood Test (FOBT)", type: "select", options: ["negative", "positive", "not_done"] },
      { name: "fitTest", label: "Fecal Immunochemical Test (FIT)", type: "select", options: ["negative", "positive", "not_done"] },
      { name: "colonoscopyPerformed", label: "Colonoscopy Performed", type: "select", options: ["yes", "no"] },
      { name: "colonoscopyResult", label: "Colonoscopy Result", type: "select", options: ["normal", "polyps_found", "suspicious_lesion", "cancer_detected"] },
      { name: "polypCount", label: "Number of Polyps", type: "number" },
      { name: "polypLocation", label: "Polyp Location", type: "select", options: ["cecum", "ascending", "transverse", "descending", "sigmoid", "rectum", "multiple"] },
      { name: "polypSize", label: "Largest Polyp Size (cm)", type: "number", step: "0.1" },
      { name: "polypectomyPerformed", label: "Polypectomy Performed", type: "select", options: ["yes", "no"] },
      { name: "biopsyResult", label: "Biopsy Result", type: "select", options: ["normal", "hyperplastic_polyp", "adenoma", "adenocarcinoma", "not_done"] },
      { name: "bowelSymptoms", label: "Bowel Symptoms", type: "select", options: ["none", "bleeding", "change_in_habits", "abdominal_pain", "weight_loss", "anemia"] },
      { name: "clinicalNotes", label: "Clinical Notes", type: "textarea" },
    ],
  },
  liver: {
    title: "Liver Screening",
    color: "emerald",
    fields: [
      { name: "afpLevel", label: "AFP Level (ng/mL)", type: "number", step: "0.1" },
      { name: "afpInterpretation", label: "AFP Interpretation", type: "select", options: ["normal", "mildly_elevated", "moderately_elevated", "highly_elevated"] },
      { name: "ultrasoundResult", label: "Ultrasound Result", type: "select", options: ["normal", "fatty_liver", "cirrhosis", "focal_lesion", "suspicious_mass"] },
      { name: "lesionSize", label: "Lesion Size (cm)", type: "number", step: "0.1" },
      { name: "lesionLocation", label: "Lesion Location", type: "select", options: ["right_lobe", "left_lobe", "both_lobes"] },
      { name: "ctScanResult", label: "CT Scan Result", type: "select", options: ["normal", "cirrhosis", "hcc_suspected", "hcc_confirmed", "not_done"] },
      { name: "mriResult", label: "MRI Result", type: "select", options: ["normal", "hcc_suspected", "hcc_confirmed", "not_done"] },
      { name: "biopsyResult", label: "Biopsy Result", type: "select", options: ["normal", "dysplasia", "hcc", "not_done"] },
      { name: "hbsagStatus", label: "HBsAg Status", type: "select", options: ["negative", "positive", "not_tested"] },
      { name: "antiHcvStatus", label: "Anti-HCV Status", type: "select", options: ["negative", "positive", "not_tested"] },
      { name: "childPughScore", label: "Child-Pugh Score (if cirrhosis)", type: "select", options: ["", "a", "b", "c"] },
      { name: "clinicalNotes", label: "Clinical Notes", type: "textarea" },
    ],
  },
};

export default function ScreeningModal({
  isOpen,
  onClose,
  visitId,
  moduleType,
  existingData,
  onComplete,
}: ScreeningModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const config = SCREENING_CONFIGS[moduleType];

  useEffect(() => {
    if (existingData) {
      setForm(existingData);
    } else {
      // Initialize with empty values
      const initialForm: Record<string, any> = {};
      config.fields.forEach((field) => {
        initialForm[field.name] = "";
      });
      setForm(initialForm);
    }
  }, [existingData, moduleType]);

  function setField(name: string, value: any) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);

    try {
      const endpoint = `/visits/${visitId}/screening/${moduleType}`;
      
      if (existingData) {
        await api.put(endpoint, form);
      } else {
        await api.post(endpoint, form);
      }

      toast.success(`${config.title} saved successfully.`);
      onComplete();
    } catch (err: any) {
      const response = err?.response?.data;
      toast.error(response?.message || `Unable to save ${config.title}.`);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (!submitting) {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Panel */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {config.title}
            </h3>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="text-gray-400 hover:text-gray-500 focus:outline-none disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className={`rounded-2xl bg-${config.color}-50 dark:bg-${config.color}-900/20 border border-${config.color}-200 dark:border-${config.color}-800 p-4 mb-6`}>
              <p className={`text-sm text-${config.color}-800 dark:text-${config.color}-200`}>
                Complete the screening fields below. All fields are optional but providing comprehensive data improves the quality of the registry.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {config.fields.map((field) => (
                <Label
                  key={field.name}
                  className={field.type === "textarea" ? "md:col-span-2" : ""}
                >
                  <span className="text-sm font-semibold">{field.label}</span>

                  {field.type === "select" && (
                    <Select
                      className="mt-2 rounded-2xl h-12 shadow-sm"
                      value={form[field.name] || ""}
                      onChange={(e) => setField(field.name, e.target.value)}
                    >
                      <option value="">Select</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </option>
                      ))}
                    </Select>
                  )}

                  {field.type === "text" && (
                    <Input
                      className="mt-2 rounded-2xl h-12 shadow-sm"
                      value={form[field.name] || ""}
                      onChange={(e) => setField(field.name, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  )}

                  {field.type === "number" && (
                    <Input
                      className="mt-2 rounded-2xl h-12 shadow-sm"
                      type="number"
                      step={field.step || "1"}
                      min="0"
                      value={form[field.name] || ""}
                      onChange={(e) => setField(field.name, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  )}

                  {field.type === "textarea" && (
                    <Textarea
                      className="mt-2 rounded-2xl shadow-sm"
                      rows={4}
                      value={form[field.name] || ""}
                      onChange={(e) => setField(field.name, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                    />
                  )}
                </Label>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end p-6 border-t dark:border-gray-700">
            <Button
              layout="outline"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-xl"
            >
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className={`rounded-xl bg-${config.color}-600 border-${config.color}-600 hover:bg-${config.color}-700`}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {existingData ? "Update" : "Save"} Screening
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}