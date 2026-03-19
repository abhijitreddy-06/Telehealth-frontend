"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, type Transition } from "framer-motion";
import { ArrowRight, Video, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

function fadeUp(i: number): Transition {
  return { duration: 0.6, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] };
}

export default function HeroSection() {
  return (
    <section className="content-overlay relative overflow-hidden pb-20 pt-12 lg:pt-16">
      {/* Subtle blobs — no blur-3xl to avoid perf hit */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-100 w-100 rounded-full bg-sky-100/30 dark:bg-sky-500/10" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-87.5 w-87.5 rounded-full bg-blue-50/30 dark:bg-indigo-500/10" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-12 px-6 lg:flex-row lg:gap-16">
        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex max-w-xl flex-1 flex-col items-start"
        >
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-[13px] font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
            Trusted by 10,000+ patients
          </span>

          <h1 className="font-heading text-[38px] font-bold leading-[1.15] tracking-tight text-slate-900 dark:text-slate-100 sm:text-[46px] lg:text-[52px]">
            Healthcare{" "}
            <span className="text-sky-500">From Anywhere</span>
          </h1>

          <p className="mt-5 text-[18px] leading-relaxed text-slate-600 dark:text-slate-300">
            Secure video consultations with trusted doctors anytime. Book
            appointments, get AI-driven insights, and manage your health — all
            from the comfort of your home.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/auth">
              <Button className="group h-13 rounded-full bg-sky-500 px-7 text-[16px] font-semibold text-white shadow-lg shadow-sky-500/20 transition-all duration-250 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-sky-600 hover:shadow-xl hover:shadow-sky-500/25 active:translate-y-0 active:scale-100">
                Book Appointment
                <ArrowRight className="ml-2 h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/auth">
              <button className="btn-fill h-13 rounded-full px-7 text-[16px] font-semibold">
                Get Started
              </button>
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-5 text-[14px] font-medium text-slate-500 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <Video className="h-4.5 w-4.5 text-sky-500" /> HD Video Calls
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" /> HIPAA Secure
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-sky-400" /> 24/7 Available
            </span>
          </div>
        </motion.div>

        {/* Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative flex-1"
        >
          <div className="relative animate-float overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-slate-950/30">
            <Image
              src="/hero-illustration.png"
              alt="Doctor video consultation platform"
              width={1200}
              height={900}
              className="aspect-4/3 w-full object-cover"
              priority
            />
            <div className="absolute bottom-5 left-5 flex items-center gap-3 rounded-xl border border-white/60 bg-white/85 px-4 py-2.5 shadow-lg backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/85">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/15">
                <Video className="h-4 w-4 text-sky-600" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Live Consultation</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-300">Dr. Smith · Cardiology</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
