import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background">
      <div className="flex items-center justify-between gap-6 px-5 py-8 md:px-20 md:py-10">
        <Link
          href="/"
          className="font-serif text-2xl font-bold italic md:text-3xl"
        >
          Cartas
        </Link>
        <p className="text-xs uppercase tracking-wide md:text-sm">
          © {new Date().getFullYear()} Cartas para o meu amor
        </p>
      </div>
    </footer>
  );
}
