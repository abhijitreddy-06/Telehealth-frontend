import Link from "next/link";
import { Github, Linkedin, Stethoscope } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-[5%] py-3 dark:border-border dark:bg-(--bg-main)">
      <div className="mx-auto grid max-w-350 grid-cols-[auto_1fr_auto] items-center gap-3 max-md:flex max-md:flex-col max-md:gap-1.5">
        <div className="flex items-center">
          <Link href="/patient/home" className="flex items-center gap-2 text-sky-500">
            <Stethoscope className="h-5 w-5 text-sky-500" />
            <span className="text-[16px] font-semibold">TeleHealth</span>
          </Link>
        </div>

        <div className="text-center">
          <span className="text-sm text-slate-700 dark:text-muted-foreground">
            &copy; {new Date().getFullYear()} Built by{" "}
            <a
              href="https://abhijitreddy-portfolio.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-800 hover:underline dark:text-foreground"
            >
              Abhijit Reddy
            </a>
            .
          </span>
        </div>

        <div className="flex justify-end gap-3 text-slate-700 max-md:justify-center dark:text-muted-foreground">
          <a
            href="https://www.linkedin.com/in/abhijitreddy75"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="transition hover:text-sky-500"
          >
            <Linkedin className="h-5 w-5" />
          </a>
          <a
            href="https://github.com/abhijitreddy-06"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="transition hover:text-sky-500"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
