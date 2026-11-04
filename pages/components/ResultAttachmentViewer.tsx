import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import api from "../../lib/api";

/**
 * Full-screen viewer for the image / PDF attached to a result.
 * The file sits on private storage, so it is fetched with the user's token and shown from a blob URL.
 */
export default function ResultAttachmentViewer({
  sampleId,
  title,
  onClose,
}: {
  sampleId: number;
  title?: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;
    api
      .get(`/screening-samples/${sampleId}/attachment`, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setType(res.data.type || "");
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setError("Could not load the image."));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sampleId]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-3" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl max-h-[92vh] bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{title || "Result printout"}</p>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 flex items-center justify-center min-h-[40vh]">
          {error ? (
            <p className="text-sm text-red-600 p-6">{error}</p>
          ) : !url ? (
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          ) : type === "application/pdf" ? (
            <iframe src={url} title="Result printout" className="w-full h-[75vh]" />
          ) : (
            <img src={url} alt="Result printout" className="max-w-full max-h-[80vh] object-contain" />
          )}
        </div>
        {url && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-right">
            <a href={url} download={`result-${sampleId}`} className="text-xs font-semibold text-green-700 underline">
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
