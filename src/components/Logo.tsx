import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  textClassName?: string;
  iconClassName?: string;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ className, textClassName, iconClassName, size = "md" }: LogoProps) {
  const sizing = {
    sm: {
      wrapper: "gap-1.5",
      iconBox: "h-7 w-7",
      text: "text-[18px]",
    },
    md: {
      wrapper: "gap-2",
      iconBox: "h-8 w-8",
      text: "text-[22px]",
    },
    lg: {
      wrapper: "gap-2.5",
      iconBox: "h-9 w-9",
      text: "text-[24px]",
    },
  }[size];

  return (
    <span className={cn("inline-flex items-center", sizing.wrapper, className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center overflow-hidden rounded-md border border-(--primary-border) bg-card dark:border-white/45 dark:bg-slate-800",
          sizing.iconBox,
          iconClassName,
        )}
        aria-hidden="true"
      >
        <Image
          src="/favicon.ico"
          alt="TeleHealthx mark"
          width={48}
          height={48}
          className="h-full w-full object-cover"
          priority
        />
      </span>
      <span className={cn("font-logo font-medium tracking-tight text-foreground", sizing.text, textClassName)}>
        Tele<span className="text-primary">Health</span>
        <span className="text-accent">x</span>
      </span>
    </span>
  );
}
