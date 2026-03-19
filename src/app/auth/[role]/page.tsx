"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthCard from "@/components/AuthCard";
import Logo from "@/components/Logo";

type Role = "patient" | "doctor";

export default function AuthRolePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = use(params);

  if (role !== "patient" && role !== "doctor") {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <section className="content-overlay flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo size="lg" className="mb-2" />
          <Link
            href="/auth"
            className="flex items-center gap-2 rounded-lg px-4.5 py-2.5 text-[16px] font-semibold text-sky-500 transition-all duration-200 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Role Selection
          </Link>
        </div>

        <div className="w-full flex justify-center">
          <AuthCard role={role as Role} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
