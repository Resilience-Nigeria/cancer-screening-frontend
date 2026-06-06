import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Badge,
  Pagination,
} from "@roketid/windmill-react-ui";
import {
  ArrowUpRight,
  Building2,
  Calendar,
  Eye,
  Loader2,
  Search,
  Stethoscope,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type ReferredClient = {
  clientId: number;
  clientName: string;
  clientCode: string;
  facilityName?: string;
  modules: string;
  referralDestinations: string;
  referralCount: number;
  lastReferralDate: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export default function ReferredClientsPage() {
  const [clients, setClients] = useState<ReferredClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const resultsPerPage = 10;

  async function fetchReferredClients() {
    setLoading(true);
    try {
      const { data } = await api.get("/dashboard/referred-clients", {
        params: { page, limit: resultsPerPage, search },
      });

      const raw = data?.data || [];
      const mapped: ReferredClient[] = raw.map((item: any) => ({
        clientId: item.clientId ?? item.client_id,
        clientName: item.clientName ?? item.client_name ?? "Unknown",
        clientCode: item.clientCode ?? item.client_code ?? "—",
        facilityName: item.facilityName ?? item.facility_name ?? "—",
        modules: item.modules ?? "—",
        referralDestinations:
          item.referralDestinations ?? item.referral_destinations ?? "—",
        referralCount: item.referralCount ?? item.referral_count ?? 0,
        lastReferralDate:
          item.lastReferralDate ?? item.last_referral_date ?? null,
      }));

      setClients(mapped);
      setTotalResults(data?.total ?? mapped.length);
    } catch (err: any) {
      toast.error("Unable to load referred clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReferredClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <Layout>
      <div className="mb-8">
        <PageTitle>Referred Clients</PageTitle>

        <div className="mt-4 rounded-3xl overflow-hidden bg-gradient-to-r from-green-800 via-green-700 to-green-600 shadow-xl">
          <div className="px-5 py-6 sm:px-8 sm:py-8 text-white">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                Referral Tracking
              </div>

              <h2 className="mt-4 text-2xl sm:text-3xl font-bold leading-tight">
                All clients referred for further care
              </h2>

              <p className="mt-3 text-sm sm:text-base text-green-100 leading-6">
                Every client with a treatment referral recorded on any screening
                module, regardless of confirmed diagnosis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by client name or ID"
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <Button
            type="submit"
            className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
          >
            Search
          </Button>
        </div>
      </form>

      <div className="rounded-3xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Loading referred clients...
            </p>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-400" />
            <h4 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
              No referred clients
            </h4>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {search
                ? "No clients match your search."
                : "Clients will appear here once treatment referrals are recorded."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {clients.map((client) => (
                <div key={client.clientId} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100 break-words">
                        {client.clientName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {client.clientCode}
                      </p>
                    </div>
                    <Badge type="primary">
                      {client.referralCount}{" "}
                      {client.referralCount === 1 ? "referral" : "referrals"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                      <Stethoscope className="w-4 h-4 mt-0.5 shrink-0" />
                      <span className="break-words">{client.modules}</span>
                    </div>
                    <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                      <ArrowUpRight className="w-4 h-4 mt-0.5 shrink-0" />
                      <span className="break-words">
                        {client.referralDestinations || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>{formatDate(client.lastReferralDate)}</span>
                    </div>
                    {client.facilityName && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Building2 className="w-4 h-4 shrink-0" />
                        <span className="break-words">
                          {client.facilityName}
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/ncsr/client-details?clientId=${client.clientId}`}
                  >
                    <Button className="w-full rounded-xl bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800">
                      <span className="inline-flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        View Client
                      </span>
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold tracking-wide uppercase border-b bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Screening Module(s)</th>
                    <th className="px-6 py-4">Referred To</th>
                    <th className="px-6 py-4">Last Referral</th>
                    <th className="px-6 py-4">Referrals</th>
                    <th className="px-6 py-4">Facility</th>
                    <th className="px-6 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {clients.map((client) => (
                    <tr
                      key={client.clientId}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-100 break-words">
                            {client.clientName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {client.clientCode}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm break-words">
                        {client.modules}
                      </td>

                      <td className="px-6 py-4 text-sm break-words">
                        {client.referralDestinations || "—"}
                      </td>

                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        {formatDate(client.lastReferralDate)}
                      </td>

                      <td className="px-6 py-4">
                        <Badge type="primary">{client.referralCount}</Badge>
                      </td>

                      <td className="px-6 py-4 text-sm break-words">
                        {client.facilityName || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <Link
                          href={`/ncsr/client-details?clientId=${client.clientId}`}
                        >
                          <Button layout="outline" className="rounded-xl">
                            <span className="inline-flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              View
                            </span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalResults > resultsPerPage && (
              <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
                <Pagination
                  totalResults={totalResults}
                  resultsPerPage={resultsPerPage}
                  onChange={setPage}
                  label="Referred clients navigation"
                />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}