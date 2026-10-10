"use client";

import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { LogoMark } from "@/components/layout/LogoMark";
import { NoticeBell } from "@/components/layout/NoticeBell";
import { signOut } from "@/lib/auth/client";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function SiteHeader({ className }: Props) {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const lastY = useRef(0);
  const ghost = className?.includes("is-ghost");
  const path = useRouterState({ select: (s) => s.location.pathname });
  const writing = path.startsWith("/escrever");
  const initial = (user?.displayName || user?.primaryEmail || "A").charAt(0).toUpperCase();

  useEffect(() => {
    setMounted(true);
  }, []);

  function leave(to: string) {
    if (leaving) return;
    setLeaving(true);
    void signOut(to).catch(() => setLeaving(false));
  }

  useEffect(() => {
    if (open) document.body.classList.add("nav-open");
    else {
      const timer = window.setTimeout(() => document.body.classList.remove("nav-open"), 680);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  useEffect(() => () => document.body.classList.remove("nav-open"), []);

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      if (ghost) setScrolled(y > 8);
      const marquee = document.querySelector(".marquee");
      if (open || noticesOpen || !marquee) {
        setHidden(false);
        lastY.current = y;
        return;
      }
      const atCarousel = marquee.getBoundingClientRect().top <= 80;
      const dy = y - lastY.current;
      if (!atCarousel || y < 24) setHidden(false);
      else if (dy > 3) setHidden(true);
      else if (dy < -3) setHidden(false);
      lastY.current = y;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, [ghost, open, noticesOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className={cn("site-header", className, scrolled && "is-scrolled", hidden && "is-hidden")}>
        <div className="site-header-inner">
          <Link to="/" className="site-header-brand" onClick={() => setOpen(false)}>
            <LogoMark className="h-9 w-10 shrink-0" />
            <span>Carta para o meu amor</span>
          </Link>
          <nav className="site-header-nav" aria-label="Principal">
            <Link to="/" hash="mensageiros" className="site-header-link">
              Mensageiros
            </Link>
            <Link to="/acompanhar" className="site-header-link">
              Acompanhar
            </Link>
            {isPending ? (
              <span className="inline-block h-8 w-8 animate-pulse rounded-full bg-ink/10" />
            ) : (
              <>
                <SignedOut>
                  <Link to="/login" search={{ next: undefined }} className="site-header-link">
                    Entrar
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link to="/conta" className="site-header-link">
                    Minha conta
                  </Link>
                  <Link to="/conta" className="site-header-avatar" aria-label="Minha conta">
                    {user?.profileImageUrl ? (
                      <img src={user.profileImageUrl} alt="" />
                    ) : (
                      <span>{initial}</span>
                    )}
                  </Link>
                </SignedIn>
              </>
            )}
            {!writing ? (
              <Link to="/escrever" className="site-header-cta">
                Escrever
              </Link>
            ) : null}
            <SignedIn>
              <NoticeBell
                open={noticesOpen}
                onOpenChange={(next) => {
                  setNoticesOpen(next);
                  if (next) setOpen(false);
                }}
              />
            </SignedIn>
            <button
              type="button"
              className="site-header-burger"
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              onClick={() => {
                setNoticesOpen(false);
                setOpen((v) => !v);
              }}
            >
              <span className={cn("site-header-burger-icon", open && "is-open")}>
                {open ? <X size={22} /> : <Menu size={22} />}
              </span>
            </button>
          </nav>
        </div>
      </header>
      {mounted
        ? createPortal(
      <nav
        id="site-menu"
        className={cn("site-menu", open && "is-open", ghost && !scrolled && "is-ghost-menu")}
        aria-hidden={!open}
        aria-label="Menu"
      >
        <button
          type="button"
          className="site-menu-close"
          style={{ "--i": 0 } as CSSProperties}
          onClick={() => setOpen(false)}
        >
          <X size={18} />
          Fechar
        </button>
        {user ? (
          <div className="site-menu-identity" style={{ "--i": 0 } as CSSProperties}>
          <Link
            to="/conta"
            className="site-menu-heart"
            onClick={() => setOpen(false)}
            aria-label="Minha conta"
          >
            {user.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" className="site-menu-heart-img" />
            ) : (
              <span className="site-menu-heart-fallback">{initial}</span>
            )}
            <svg viewBox="0 0 80 72" className="site-menu-heart-ring" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinejoin="round"
                d="M40 62.5C38.8 62.5 18 48.4 18 34.2 18 26.4 24 21 31.2 21c4.2 0 7.3 2.1 8.8 5.4C41.5 23.1 44.6 21 48.8 21 56 21 62 26.4 62 34.2 62 48.4 41.2 62.5 40 62.5z"
              />
            </svg>
          </Link>
          <p className="site-menu-name">{user.displayName || user.primaryEmail}</p>
          </div>
        ) : null}
        <Link to="/" hash="mensageiros" style={{ "--i": 1 } as CSSProperties} onClick={() => setOpen(false)}>
          Mensageiros
        </Link>
        <Link to="/acompanhar" style={{ "--i": 2 } as CSSProperties} onClick={() => setOpen(false)}>
          Acompanhar
        </Link>
        {!writing ? (
          <Link to="/escrever" style={{ "--i": 3 } as CSSProperties} onClick={() => setOpen(false)}>
            Escrever
          </Link>
        ) : null}
        <SignedOut>
          <Link
            to="/login"
            search={{ next: undefined }}
            style={{ "--i": 4 } as CSSProperties}
            onClick={() => setOpen(false)}
          >
            Entrar
          </Link>
        </SignedOut>
        <SignedIn>
          <Link to="/conta" style={{ "--i": 3 } as CSSProperties} onClick={() => setOpen(false)}>
            Minha conta
          </Link>
          <button
            type="button"
            className="site-menu-link"
            style={{ "--i": 4 } as CSSProperties}
            disabled={leaving}
            onClick={() => leave("/login")}
          >
            Trocar conta
          </button>
          <button
            type="button"
            className="site-menu-link"
            style={{ "--i": 5 } as CSSProperties}
            disabled={leaving}
            onClick={() => leave("/")}
          >
            Sair
          </button>
        </SignedIn>
      </nav>,
      document.body,
    )
        : null}
    </>
  );
}
