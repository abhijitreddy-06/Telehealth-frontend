"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Brain,
  Calendar,
  ClipboardList,
  FileText,
  Loader2,
  Pill,
  Search,
  Stethoscope,
  TrendingUp,
  Video,
} from "lucide-react";
import DashboardLayout, { type NavItem } from "@/components/DashboardLayout";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getUserProfile, type UserProfile } from "@/lib/api";
import { extractContractData, extractContractMessage, isContractFailure } from "@/lib/contract";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/backend";

const patientNav: NavItem[] = [
  { href: "/patient/home", label: "Home", icon: Activity },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/patient/video/dashboard", label: "Video Consult", icon: Video },
  { href: "/pharmacy", label: "Pharmacy", icon: Pill },
  { href: "/records", label: "My Records", icon: FileText },
  { href: "/predict", label: "AI Pre Advice", icon: Stethoscope },
];

const sectionAnim = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

type Severity = "low" | "moderate" | "critical" | "unknown";

interface Condition {
  condition: string;
  confidence: number;
}

interface PrecheckResult {
  input?: string;
  severity?: Severity;
  recommendation?: string;
  top_conditions?: Condition[];
  red_flags?: string[];
  disclaimer?: string;
  offline?: boolean;
  error?: string;
}

function severityClasses(severity: Severity) {
  if (severity === "low") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
  if (severity === "moderate") return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
  if (severity === "critical") return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
}

export default function PredictPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [symptoms, setSymptoms] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PrecheckResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const initialTheme: "light" | "dark" =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : "light";

    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    localStorage.setItem("theme", initialTheme);
    setTheme(initialTheme);
  }, []);

  const handleThemeToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("theme", nextTheme);
    setTheme(nextTheme);
  };

  useEffect(() => {
    let cancelled = false;
    getUserProfile()
      .then((res) => {
        if (!cancelled) setProfile(res.profile);
      })
      .catch(() => {
        if (!cancelled) router.replace("/auth/patient");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userName = profile?.full_name?.split(" ")[0] || "Patient";
  const userInitial = userName.charAt(0).toUpperCase();

  const characterCount = symptoms.length;

  const safeResult = useMemo<Required<Pick<PrecheckResult, "top_conditions" | "red_flags">> & {
    severity: Severity;
    recommendation: string;
    disclaimer: string;
  }>(() => {
    return {
      top_conditions: result?.top_conditions || [],
      red_flags: result?.red_flags || [],
      severity: (result?.severity || "unknown") as Severity,
      recommendation:
        result?.recommendation ||
        "Please consult a healthcare professional for further guidance.",
      disclaimer:
        result?.disclaimer ||
        "This AI analysis is for informational purposes only and does not replace professional medical advice.",
    };
  }, [result]);

  const runPrecheck = async () => {
    const text = symptoms.trim();
    if (!text) {
      setResult(null);
      setErrorMessage("Please enter your symptoms");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/ai/precheck`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const raw = await response.json().catch(() => null);
      const data = extractContractData<PrecheckResult | null>(raw);

      if (!response.ok || isContractFailure(raw)) {
        setErrorMessage(extractContractMessage(raw, "AI service is currently unavailable. Please try again later."));
        return;
      }

      if (!data) {
        setErrorMessage("AI service returned an empty response. Please try again.");
        return;
      }

      if (data.error) {
        setErrorMessage(data.error);
        return;
      }

      setResult(data);
    } catch {
      setErrorMessage("AI service is currently unavailable. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <DashboardLayout
      navItems={patientNav}
      userName={userName}
      userInitial={userInitial}
      role="patient"
      theme={theme}
      onToggleTheme={handleThemeToggle}
      footer={<Footer />}
    >
      <motion.section
        {...sectionAnim}
        className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      >
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          AI Pre-Consultation Check
        </h1>
        <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-300">
          Describe your symptoms before booking a video call for AI-powered analysis.
        </p>
      </motion.section>

      <motion.section className="grid gap-6 lg:grid-cols-2" {...sectionAnim}>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-white dark:bg-sky-500">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Describe Your Symptoms</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Be as detailed as possible for accurate analysis</p>
            </div>
          </div>

          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            maxLength={1000}
            placeholder="Example: High fever (102°F), persistent headache, body pain for 2 days, occasional nausea, loss of appetite..."
            className="min-h-52 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-[15px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-sky-500/20"
          />

          <div className="mt-2 mb-5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Enter symptoms in detail</span>
            <span>{characterCount}/1000 characters</span>
          </div>

          <Button
            className="h-12 w-full rounded-xl bg-sky-500 text-base font-semibold text-white hover:bg-sky-600"
            onClick={runPrecheck}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-5 w-5" /> Analyze Symptoms
              </>
            )}
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-white dark:bg-sky-500">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">AI Analysis Results</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Your results will appear here</p>
            </div>
          </div>

          {submitting ? (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <Loader2 className="mb-3 h-10 w-10 animate-spin text-sky-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Analyzing Symptoms</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Our AI is processing your symptoms...</p>
            </div>
          ) : errorMessage ? (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <AlertTriangle className="mb-3 h-10 w-10 text-red-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Analysis Error</h3>
              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-300">{errorMessage}</p>
              <Button className="mt-4 rounded-xl" variant="outline" onClick={runPrecheck}>
                Try Again
              </Button>
            </div>
          ) : !result ? (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <ClipboardList className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No Analysis Yet</h3>
              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-300">
                Enter your symptoms in the left panel to get AI-powered analysis.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {safeResult.top_conditions.length > 0 && (
                <div>
                  <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                    Possible Conditions
                  </h4>
                  <div className="space-y-3">
                    {safeResult.top_conditions.map((item, index) => {
                      const percent = Math.round((item.confidence || 0) * 100);
                      return (
                        <div
                          key={`${item.condition}-${index}`}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{item.condition}</span>
                            <span className="text-lg font-bold text-sky-600 dark:text-sky-300">{percent}%</span>
                          </div>
                          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sky-100 dark:bg-sky-500/20">
                            <div
                              className="h-full rounded-full bg-sky-500 transition-all duration-700"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">Severity Level</h4>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${severityClasses(safeResult.severity)}`}>
                  {safeResult.severity.toUpperCase()}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <h4 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Recommendation</h4>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{safeResult.recommendation}</p>
              </div>

              {safeResult.red_flags.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">Red Flags Detected</h4>
                  </div>
                  <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                    {safeResult.red_flags.map((flag, index) => (
                      <li key={`${flag}-${index}`}>⚠️ {flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {safeResult.disclaimer}
              </p>
            </div>
          )}
        </div>
      </motion.section>
    </DashboardLayout>
  );
}
