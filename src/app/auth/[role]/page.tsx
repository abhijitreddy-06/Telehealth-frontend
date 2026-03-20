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
    <div className="auth-hero-bg flex min-h-screen flex-col">
      <Navbar />

      <section className="content-overlay flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo size="lg" className="mb-2" />
          <Link
            href="/auth"
            className="menu-item flex items-center gap-2 text-[16px] font-semibold text-sky-200 transition-colors hover:text-white"
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
