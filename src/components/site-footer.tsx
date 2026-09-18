import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-foreground/6 bg-[#FEF5EC]">
      <div className="flex flex-col items-center justify-between gap-4 px-5 py-10 text-center md:flex-row md:px-12 md:text-left lg:px-20">
        <Link
          href="/"
          className="font-[family-name:var(--font-fraunces)] text-lg font-medium tracking-tight text-foreground"
        >
          Cartas para o meu amor
        </Link>
        <p className="text-xs tracking-wide text-muted-foreground">
          © {new Date().getFullYear()} · Feito com carinho
        </p>
      </div>
    </footer>
  );
}
