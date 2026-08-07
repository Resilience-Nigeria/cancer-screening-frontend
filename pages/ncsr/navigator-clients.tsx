"use client";
import React, { useEffect, useState } from "react";
import { Table, TableHeader, TableCell, TableBody, TableRow, TableFooter, TableContainer, Badge, Input } from "@roketid/windmill-react-ui";
import api from "@/lib/api";
import Layout from "./layout";

interface NavigatorClient {
  registrationId: number;
  clientId: string | null;
  fullName: string;
  phoneNumber: string;
  riskCategory: "low" | "average" | "increased" | "symptomatic_high" | null;
  stage: string;
  stageLabel: string;
}

const RISK_BADGE: Record<string, "success" | "primary" | "warning" | "danger"> = {
  low: "success",
  average: "primary",
  increased: "warning",
  symptomatic_high: "danger",
};

export default function NavigatorClientsPage() {
  const [clients, setClients] = useState<NavigatorClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/navigator/clients");
        setClients(data.clients ?? []);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? "Failed to load your assigned clients.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = clients.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.phoneNumber.includes(search)
  );

  return (
    <Layout>
        
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">My Assigned Clients</h1>
        <Input
          className="w-64"
          placeholder="Search by name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <TableContainer>
          <Table>
            <TableHeader>
              <tr>
                <TableCell>Name</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Risk</TableCell>
                <TableCell>Stage</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.registrationId}>
                  <TableCell>
                    <span className="font-medium text-gray-900">{c.fullName}</span>
                  </TableCell>
                  <TableCell>{c.phoneNumber}</TableCell>
                  <TableCell>
                    {c.riskCategory ? (
                      <Badge type={RISK_BADGE[c.riskCategory] ?? "neutral"}>
                        {c.riskCategory.replace("_", " ")}
                      </Badge>
                    ) : (
                      <span className="text-xs text-gray-400">Not assessed</span>
                    )}
                  </TableCell>
                  <TableCell>{c.stageLabel}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-gray-400 py-6">
                    No clients assigned yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
    </Layout>
  );
}