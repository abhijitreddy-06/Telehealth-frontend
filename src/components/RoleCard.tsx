"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface RoleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  accentColor: string;
  iconColor: string;
}

export default function RoleCard({
  icon: Icon,
  title,
  description,
  href,
  accentColor,
  iconColor,
}: RoleCardProps) {
  return (
    <Link href={href} className="block">
      <div className="group flex h-85 w-85 cursor-pointer flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-md transition-all duration-300 hover:-translate-y-2 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-100/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:shadow-sky-900/20">
        <div
          className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${accentColor} transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className={`h-8 w-8 ${iconColor}`} />
        </div>
        <h3 className="font-heading mb-2 text-[20px] font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <p className="mb-5 text-[14px] leading-relaxed text-slate-500 dark:text-slate-300">
          {description}
        </p>
        <span className="inline-block min-w-37.5 rounded-full bg-sky-500 px-6 py-2.5 text-center text-[14px] font-semibold text-white shadow-lg shadow-sky-500/20 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-sky-600 group-hover:shadow-xl group-hover:shadow-sky-500/25">
          Continue
        </span>
      </div>
    </Link>
  );
}
