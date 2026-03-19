"use client";

import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accentColor?: string;
  iconColor?: string;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  accentColor = "bg-sky-100",
  iconColor = "text-sky-600",
}: FeatureCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-100/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:shadow-sky-900/20">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${accentColor} transition-transform duration-300 group-hover:scale-110`}
      >
        <Icon className={`h-5.5 w-5.5 ${iconColor}`} />
      </div>
      <h3 className="font-heading mb-2 text-[17px] font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="text-[15px] leading-relaxed text-slate-500 dark:text-slate-300">{description}</p>
    </div>
  );
}
