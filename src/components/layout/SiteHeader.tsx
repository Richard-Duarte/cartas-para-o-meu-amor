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
  const [leaving, setLeaving] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
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

  // Some ao descer e volta ao subir acompanhando o dedo (como a barra do Safari/Chrome):
  // o deslocamento segue a rolagem quadro a quadro e, ao parar no meio, encaixa
  // aberto ou fechado. Só transform, fora do React (nada de re-render por quadro).
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let offset = 0;
    let lastY = Math.max(0, window.scrollY);
    let dir = 0;
    let frame = 0;
    let idle = 0;
    let clearTimer = 0;
    let height = el.offsetHeight || 64;

    const paint = (snap: boolean) => {
      window.clearTimeout(clearTimer);
      if (reduce.matches) {
        el.removeAttribute("data-bar-moving");
        el.removeAttribute("data-bar-snap");
        el.toggleAttribute("data-bar-hidden", offset <= -height / 2);
        return;
      }
      el.toggleAttribute("data-bar-snap", snap);
      el.toggleAttribute("data-bar-hidden", offset <= -height + 0.5);
      el.style.setProperty("--bar-y", `${offset}px`);
      if (offset !== 0) {
        el.setAttribute("data-bar-moving", "");
      } else if (!snap) {
        el.removeAttribute("data-bar-moving");
      } else {
        // Depois de encaixar em 0, solta o transform (não prende elementos fixos internos).
        clearTimer = window.setTimeout(() => {
          if (offset === 0) {
            el.removeAttribute("data-bar-moving");
            el.removeAttribute("data-bar-snap");
          }
        }, 260);
      }
    };

    const settle = () => {
      if (offset === 0 || offset === -height) return;
      const shown = -offset / height;
      offset = shown < 0.2 ? 0 : shown > 0.8 ? -height : dir > 0 ? -height : 0;
      paint(true);
    };

    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      if (ghost) setScrolled(y > 8);
      const dy = y - lastY;
      lastY = y;
      const marquee = document.querySelector(".marquee");
      const free = !open && !noticesOpen && Boolean(marquee) && marquee!.getBoundingClientRect().top <= 80 && y >= 24;
      if (!free) {
        window.clearTimeout(idle);
        if (offset !== 0) {
          offset = 0;
          paint(true);
        }
        return;
      }
      if (!dy) return;
      dir = dy > 0 ? 1 : -1;
      const next = Math.min(0, Math.max(-height, offset - dy));
      if (next !== offset) {
        offset = next;
        paint(false);
      }
      window.clearTimeout(idle);
      idle = window.setTimeout(settle, 140);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const ro =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            height = el.offsetHeight || height;
          })
        : null;
    ro?.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      window.clearTimeout(clearTimer);
      ro?.disconnect();
    };
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
      <header ref={headerRef} className={cn("site-header", className, scrolled && "is-scrolled")}>
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
                      <img src={user.profileImageUrl} alt="" referrerPolicy="no-referrer" />
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
              <img src={user.profileImageUrl} alt="" className="site-menu-heart-img" referrerPolicy="no-referrer" />
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
