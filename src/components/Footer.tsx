import Link from "next/link";
import { Github, Linkedin } from "lucide-react";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card px-[5%] py-3">
      <div className="mx-auto grid max-w-350 grid-cols-[auto_1fr_auto] items-center gap-3 max-md:flex max-md:flex-col max-md:gap-1.5">
        <div className="flex items-center">
          <Link href="/patient/home" className="flex items-center gap-2 text-primary">
            <Logo size="sm" />
          </Link>
        </div>

        <div className="text-center">
          <span className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Built by{" "}
            <a
              href="https://abhijitreddy-portfolio.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:underline"
            >
              Abhijit Reddy
            </a>
            .
          </span>
        </div>

        <div className="flex justify-end gap-3 text-muted-foreground max-md:justify-center">
          <a
            href="https://www.linkedin.com/in/abhijitreddy75"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="transition hover:text-primary"
          >
            <Linkedin className="h-5 w-5" />
          </a>
          <a
            href="https://github.com/abhijitreddy-06"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="transition hover:text-primary"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
