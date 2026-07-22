import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Loader2 } from "lucide-react";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import TreatmentModalitiesPanel from "../components/TreatmentModalitiesPanel";

export default function TreatmentModalitiesPage() {
  const router = useRouter();
  const [planId, setPlanId] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    const pId = Number(router.query.planId);
    setPlanId(pId || null);
    setReady(true);
  }, [router.isReady]);

  if (!ready) {
    return (
      <Layout>
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
      </Layout>
    );
  }

  if (!planId) {
    return (
      <Layout>
        <p className="text-sm text-gray-500">No treatment plan specified. Start from the Stage 4 wizard.</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <button onClick={() => router.push(`/ncsr/treatment-plan`)} className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 dark:text-green-400 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Treatment Plan
        </button>
        <div className="mt-3">
          <PageTitle>4.6 Treatment Modalities</PageTitle>
          <p className="text-sm text-gray-500 mt-1">A patient may receive one or more of the following.</p>
        </div>
      </div>

      <div className="max-w-2xl bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <TreatmentModalitiesPanel planId={planId} />
      </div>
    </Layout>
  );
}
