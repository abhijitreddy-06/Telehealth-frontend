"use client";

import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeatureCard from "@/components/FeatureCard";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import {
  Video,
  ShieldCheck,
  Brain,
  CalendarCheck,
  MessageCircle,
  Pill,
  Star,
  Quote,
} from "lucide-react";

const features = [
  {
    icon: Video,
    title: "HD Video Consultations",
    description: "Crystal-clear video calls with doctors using enterprise-grade WebRTC.",
    accentColor: "bg-sky-100",
    iconColor: "text-sky-600",
  },
  {
    icon: ShieldCheck,
    title: "Secure Medical Records",
    description: "Your health data is encrypted and stored with full HIPAA compliance.",
    accentColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    icon: Brain,
    title: "AI-Powered Assistance",
    description: "Get preliminary symptom analysis powered by advanced machine learning.",
    accentColor: "bg-violet-100",
    iconColor: "text-violet-600",
  },
  {
    icon: CalendarCheck,
    title: "Smart Scheduling",
    description: "Book, reschedule, or cancel appointments with real-time availability.",
    accentColor: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    icon: MessageCircle,
    title: "Instant Messaging",
    description: "Chat with your healthcare provider for follow-ups and quick questions.",
    accentColor: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  {
    icon: Pill,
    title: "Digital Prescriptions",
    description: "Receive and order prescriptions directly through our integrated portal.",
    accentColor: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
];

const steps = [
  { step: "01", title: "Create Your Account", description: "Sign up in seconds with your phone number." },
  { step: "02", title: "Find a Doctor", description: "Browse our curated network of verified specialists." },
  { step: "03", title: "Book & Consult", description: "Schedule a time and connect via HD video call." },
  { step: "04", title: "Get Prescription", description: "Receive digital prescriptions and order medications." },
];

const testimonials = [
  {
    name: "Sarah M.",
    role: "Patient",
    quote: "TeleHealthx made it incredibly easy to see a specialist without leaving my home!",
    rating: 5,
  },
  {
    name: "Dr. Patel",
    role: "Cardiologist",
    quote: "The platform streamlines my workflow. I can manage everything in one place.",
    rating: 5,
  },
  {
    name: "James L.",
    role: "Patient",
    quote: "The experience was seamless. Got my prescription within the hour.",
    rating: 5,
  },
];

const sectionAnim = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <HeroSection />

      {/* Features */}
      <motion.section {...sectionAnim} className="content-overlay py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block text-[13px] font-bold uppercase tracking-wider text-sky-600">
              Why TeleHealthx
            </span>
            <h2 className="font-heading text-[36px] font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[40px]">
              Everything you need for modern healthcare
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[16px] leading-relaxed text-slate-500 dark:text-slate-300">
              Our platform combines cutting-edge technology with compassionate care.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </motion.section>

      {/* How It Works */}
      <motion.section {...sectionAnim} className="content-overlay py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block text-[13px] font-bold uppercase tracking-wider text-sky-600">
              Simple Process
            </span>
            <h2 className="font-heading text-[36px] font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[40px]">
              How it works
            </h2>
          </div>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.step} className="text-center">
                <span className="font-heading mb-3 inline-block text-[48px] font-bold text-sky-100">
                  {s.step}
                </span>
                <h3 className="font-heading mb-2 text-[18px] font-bold text-slate-900 dark:text-slate-100">
                  {s.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-slate-500 dark:text-slate-300">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Testimonials */}
      <motion.section {...sectionAnim} className="content-overlay py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block text-[13px] font-bold uppercase tracking-wider text-sky-600">
              Testimonials
            </span>
            <h2 className="font-heading text-[36px] font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[40px]">
              Trusted by patients & doctors
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-100/30 dark:border-slate-700 dark:bg-slate-900 dark:hover:shadow-sky-900/20"
              >
                <Quote className="mb-3 h-7 w-7 text-sky-200" />
                <p className="mb-5 flex-1 text-[15px] italic leading-relaxed text-slate-600 dark:text-slate-300">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{t.name}</p>
                    <p className="text-[13px] text-slate-400">{t.role}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
}
