"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  Calendar,
  FileText,
  Pill,
  Stethoscope,
  Video,
  CalendarCheck,
  Clock3,
  Loader2,
} from "lucide-react";
import DashboardLayout, { type NavItem } from "@/components/DashboardLayout";
import Footer from "@/components/Footer";
import { getUserProfile, type UserProfile } from "@/lib/api";

const patientNav: NavItem[] = [
  { href: "/patient/home", label: "Home", icon: Activity },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/patient/video/dashboard", label: "Video Consult", icon: Video },
  { href: "/pharmacy", label: "Pharmacy", icon: Pill },
  { href: "/records", label: "My Records", icon: FileText },
  { href: "/predict", label: "AI Pre Advice", icon: Stethoscope },
];

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const features = [
  {
    icon: Video,
    title: "Virtual Consultations",
    text: "Connect with doctors through secure video calls from anywhere. No travel required.",
  },
  {
    icon: FileText,
    title: "Health Vault",
    text: "Securely store and access your medical records, prescriptions, and test results.",
  },
  {
    icon: Calendar,
    title: "Appointment Dashboard",
    text: "Manage all your appointments in one place. Schedule, reschedule, or cancel easily.",
  },
];

const stats = [
  { value: "25k+", label: "Patients Served" },
  { value: "500+", label: "Healthcare Providers" },
  { value: "98%", label: "Patient Satisfaction" },
  { value: "24/7", label: "Availability" },
];

export default function PatientHomePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const initialTheme: "light" | "dark" =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    localStorage.setItem("theme", initialTheme);
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getUserProfile();
        setProfile(data.profile);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  const userName = profile?.full_name?.split(" ")[0] || "Patient";
  const userInitial = userName.charAt(0).toUpperCase();

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
      onToggleTheme={toggleTheme}
      footer={<Footer />}
    >
      <motion.section
        {...fadeUp}
        className="grid items-center gap-8 rounded-3xl border border-sky-100 bg-white p-6 shadow-sm md:grid-cols-2 md:p-10 dark:border-slate-700 dark:bg-slate-900"
      >
        <div>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 dark:text-slate-100 md:text-4xl">
            Your <span className="bg-linear-to-r from-sky-500 to-sky-700 bg-clip-text text-transparent">Virtual Healthcare</span> Solution
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
            Access top healthcare professionals from the comfort of your home. TeleHealth makes healthcare
            accessible, affordable, and convenient.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/appointments"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition hover:bg-sky-600"
            >
              <CalendarCheck className="h-4 w-4" />
              Book Appointment
            </Link>
            <Link
              href="/patient/video/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-sky-300 px-5 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 dark:border-sky-500/40 dark:text-sky-300 dark:hover:bg-sky-500/10"
            >
              <Video className="h-4 w-4" />
              Video Consultation
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-md dark:border-slate-700">
          <img
            src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&h=620"
            alt="Virtual consultation"
            className="h-full w-full object-cover"
          />
        </div>
      </motion.section>

      <motion.section {...fadeUp} transition={{ delay: 0.1 }}>
        <div className="mb-5 text-center">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Our Healthcare Services</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Comprehensive virtual healthcare solutions tailored to your needs.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {features.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-sky-700 text-white">
                <item.icon className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{item.title}</h4>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.text}</p>
            </article>
          ))}
        </div>
      </motion.section>

      <motion.section
        {...fadeUp}
        transition={{ delay: 0.2 }}
        className="grid items-center gap-8 rounded-3xl border border-slate-200 bg-white p-6 md:grid-cols-2 md:p-10 dark:border-slate-700 dark:bg-slate-900"
      >
        <div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Book an Appointment in 3 Simple Steps</h3>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Getting care is easy. Pick your doctor, choose the slot, and connect instantly.
          </p>

          <div className="mt-6 space-y-4">
            {[
              ["1", "Choose Your Specialist", "Select from our network of board-certified doctors and specialists."],
              ["2", "Select Date and Time", "Pick a convenient time slot that works best for you."],
              ["3", "Connect Virtually", "Join your video consultation at the scheduled time."],
            ].map(([num, title, text]) => (
              <div key={num} className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-sky-700 text-sm font-semibold text-white">
                  {num}
                </span>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{text}</p>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/appointments"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition hover:bg-sky-600"
          >
            <Clock3 className="h-4 w-4" />
            Schedule Now
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-md dark:border-slate-700">
          <img
            src="https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?auto=format&fit=crop&w=900&h=620"
            alt="Appointment booking"
            className="h-full w-full object-cover"
          />
        </div>
      </motion.section>

      <motion.section
        {...fadeUp}
        transition={{ delay: 0.3 }}
        className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 text-center sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-700 dark:bg-slate-900"
      >
        {stats.map((item) => (
          <div key={item.label} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-3xl font-bold text-sky-600 dark:text-sky-300">{item.value}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.label}</p>
          </div>
        ))}
      </motion.section>

    </DashboardLayout>
  );
}
