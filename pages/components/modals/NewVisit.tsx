import React, { useState } from "react";
import { Button, Label, Input, Select, Textarea, HelperText } from "@roketid/windmill-react-ui";
import { Loader2, CalendarDays, ClipboardList, FileText, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../../lib/api";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onVisitCreated: (visitId: number) => void;
  isFirstVisit?: boolean;
};

const CustomModal = ({ isOpen, onClose, children }: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>

          {children}
        </div>
      </div>
    </div>
  );
};

export default function NewVisitModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onVisitCreated,
  isFirstVisit = false,
}: Props) {
  const [form, setForm] = useState({
    visitDate: new Date().toISOString().split("T")[0],
    visitType: isFirstVisit ? "initial" : "follow_up",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function setField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.visitDate) e.visitDate = "Required";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const v = validate();
    if (Object.keys(v).length) {
      setErrors(v);
      toast.error("Fix required fields");
      return;
    }

    setSubmitting(true);

    try {
      const { data } = await api.post(`/clients/${clientId}/visits`, form);

      const visitId = data?.visit?.visitId || data?.visitId;
      toast.success("Visit created");

      setForm({
        visitDate: new Date().toISOString().split("T")[0],
        visitType: isFirstVisit ? "initial" : "follow_up",
        notes: "",
      });

      onVisitCreated(visitId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (!submitting) {
      setForm({
        visitDate: new Date().toISOString().split("T")[0],
        visitType: isFirstVisit ? "initial" : "follow_up",
        notes: "",
      });
      setErrors({});
      onClose();
    }
  }

  return (
    <CustomModal isOpen={isOpen} onClose={handleClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <h2 className="text-xl font-semibold">
          New Visit for {clientName}
        </h2>

        {/* info */}
        <div className="rounded-xl bg-green-50 p-3 text-sm">
          Create visit first, then add screenings.
        </div>

        {/* date */}
        <Label>
          Visit Date
          <div className="relative mt-2">
            <Input
              type="date"
              value={form.visitDate}
              onChange={(e) => setField("visitDate", e.target.value)}
              className="pl-10"
            />
            <CalendarDays className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          </div>
          {errors.visitDate && (
            <HelperText valid={false}>{errors.visitDate}</HelperText>
          )}
        </Label>

        {/* type */}
        <Label>
          Visit Type
          <div className="relative mt-2">
            <Select
              value={form.visitType}
              onChange={(e) => setField("visitType", e.target.value)}
              disabled={isFirstVisit}
              className="pl-10"
            >
              <option value="initial">Initial</option>
              <option value="follow_up">Follow-up</option>
            </Select>
            <ClipboardList className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          </div>
        </Label>

        {/* notes */}
        <Label>
          Notes
          <div className="relative mt-2">
            <Textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              className="pl-10"
            />
            <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          </div>
        </Label>

        {/* actions */}
        <div className="flex justify-end gap-3 pt-3">
          <Button layout="outline" type="button" onClick={handleClose}>
            Cancel
          </Button>

          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin w-4 h-4" />
                Creating...
              </span>
            ) : (
              "Create Visit"
            )}
          </Button>
        </div>
      </form>
    </CustomModal>
  );
}