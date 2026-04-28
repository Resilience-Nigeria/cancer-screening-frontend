import React, { useState, useEffect } from "react";
import { Button, Badge } from "@roketid/windmill-react-ui";
import { Stethoscope, Check, ChevronRight, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../../lib/api";

// Sub-modals
import CervicalScreeningModal from "./screening/CervicalModal";
import BreastScreeningModal from "./screening/BreastModal";
import ProstateScreeningModal from "./screening/ProstateModal";
import ColorectalScreeningModal from "./screening/ColorectalModal";
import LiverScreeningModal from "./screening/LiverModal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  visitId: number | null;
  clientGender: string;
  onComplete: () => void;
};

type ModuleStatus = {
  cervical: boolean;
  breast: boolean;
  prostate: boolean;
  colorectal: boolean;
  liver: boolean;
};

const CustomModal = ({
  isOpen,
  onClose,
  children,
}: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* close */}
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

export default function ScreeningModuleSelector({
  isOpen,
  onClose,
  visitId,
  clientGender,
  onComplete,
}: Props) {
  const [moduleStatus, setModuleStatus] = useState<ModuleStatus>({
    cervical: false,
    breast: false,
    prostate: false,
    colorectal: false,
    liver: false,
  });

  const [activeModule, setActiveModule] = useState<string | null>(null);

  useEffect(() => {
    if (visitId && isOpen) fetchModuleStatus();
  }, [visitId, isOpen]);

  async function fetchModuleStatus() {
    if (!visitId) return;

    try {
      const { data } = await api.get(`/visits/${visitId}`);
      const visit = data?.visit || data?.data;

      setModuleStatus({
        cervical: !!(visit?.cervicalScreening || visit?.cervical_screening),
        breast: !!(visit?.breastScreening || visit?.breast_screening),
        prostate: !!(visit?.prostateScreening || visit?.prostate_screening),
        colorectal: !!(visit?.colorectalScreening || visit?.colorectal_screening),
        liver: !!(visit?.liverScreening || visit?.liver_screening),
      });
    } catch (err) {
      console.error(err);
    }
  }

  function handleModuleComplete(module: keyof ModuleStatus) {
    setActiveModule(null);
    setModuleStatus((prev) => ({ ...prev, [module]: true }));
    fetchModuleStatus();
    toast.success(`${module} screening saved`);
  }

  function handleClose() {
    if (!activeModule) {
      onComplete();
      onClose();
    }
  }

  const modules = [
    ...(clientGender === "female"
      ? [
          { id: "cervical", name: "Cervical Screening" },
          { id: "breast", name: "Breast Screening" },
        ]
      : []),

    ...(clientGender === "male"
      ? [{ id: "prostate", name: "Prostate Screening" }]
      : []),

    { id: "colorectal", name: "Colorectal Screening" },
    { id: "liver", name: "Liver Screening" },
  ];

  const completedCount = Object.values(moduleStatus).filter(Boolean).length;

  return (
    <>
      <CustomModal isOpen={isOpen && !activeModule} onClose={handleClose}>
        <h2 className="text-lg font-semibold mb-4">Screening Modules</h2>

        {/* progress */}
        <div className="mb-4 rounded-xl bg-green-50 p-3">
          <p className="text-sm">
            <strong>{completedCount}</strong> of {modules.length} completed
          </p>
        </div>

        {/* modules */}
        <div className="space-y-3">
          {modules.map((module) => {
            const done = moduleStatus[module.id as keyof ModuleStatus];

            return (
              <div
                key={module.id}
                className="flex items-center justify-between border rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100">
                    {done ? (
                      <Check className="text-green-600 w-5 h-5" />
                    ) : (
                      <Stethoscope className="text-gray-400 w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <p className="font-medium">{module.name}</p>
                    <p className="text-xs text-gray-500">
                      {done ? "Completed" : "Not started"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {done && <Badge type="success">Done</Badge>}

                  <Button
                    size="small"
                    layout="outline"
                    onClick={() => setActiveModule(module.id)}
                  >
                    {done ? "Edit" : "Start"}
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* footer */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleClose}>Done</Button>
        </div>
      </CustomModal>

      {/* sub-modals */}
      {visitId && (
        <>
          <CervicalScreeningModal
            isOpen={activeModule === "cervical"}
            onClose={() => setActiveModule(null)}
            visitId={visitId}
            onComplete={() => handleModuleComplete("cervical")}
          />

          <BreastScreeningModal
            isOpen={activeModule === "breast"}
            onClose={() => setActiveModule(null)}
            visitId={visitId}
            onComplete={() => handleModuleComplete("breast")}
          />

          <ProstateScreeningModal
            isOpen={activeModule === "prostate"}
            onClose={() => setActiveModule(null)}
            visitId={visitId}
            onComplete={() => handleModuleComplete("prostate")}
          />

          <ColorectalScreeningModal
            isOpen={activeModule === "colorectal"}
            onClose={() => setActiveModule(null)}
            visitId={visitId}
            onComplete={() => handleModuleComplete("colorectal")}
          />

          <LiverScreeningModal
            isOpen={activeModule === "liver"}
            onClose={() => setActiveModule(null)}
            visitId={visitId}
            onComplete={() => handleModuleComplete("liver")}
          />
        </>
      )}
    </>
  );
}