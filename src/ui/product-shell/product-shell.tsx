"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { FutureYouWordmark } from "../brand/future-you-wordmark";
import { ProductIcon, type ProductIconName } from "./product-icon";

export type ProductDestination = "home" | "goals" | "ask" | "benefits";

const DESTINATIONS: readonly Readonly<{
  id: ProductDestination;
  label: string;
  href: string;
  icon: ProductIconName;
}>[] = [
  { id: "home", label: "Home", href: "/home", icon: "home" },
  { id: "goals", label: "Goals", href: "/goals", icon: "goals" },
  { id: "ask", label: "Ask", href: "/ask", icon: "ask" },
  { id: "benefits", label: "Benefits", href: "/benefits", icon: "benefits" }
];

export function ProductHeader({ action }: Readonly<{ action?: ReactNode }>) {
  return (
    <header className="fy-app-header">
      <Link className="fy-wordmark" href="/home" aria-label="Future You home">
        <FutureYouWordmark/>
      </Link>
      {action ?? (
        <Link className="fy-profile-link" href="/settings/financial-context" aria-label="Open financial context settings">
          <Image src="/images/sarah-profile.png" alt="" width={44} height={44} priority/>
        </Link>
      )}
    </header>
  );
}

export function ProductNavigation({ active }: Readonly<{ active: ProductDestination }>) {
  return (
    <nav className="fy-bottom-nav" aria-label="Product navigation">
      {DESTINATIONS.map((destination) => (
        <Link
          href={destination.href}
          className={destination.id === active ? "active" : undefined}
          aria-current={destination.id === active ? "page" : undefined}
          key={destination.id}
        >
          <span className="fy-nav-icon"><ProductIcon name={destination.icon}/></span>
          <span>{destination.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function ProductShell({
  active,
  className = "",
  headerAction,
  children,
  testId
}: Readonly<{
  active: ProductDestination;
  className?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  testId?: string;
}>) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [active]);

  return (
    <div className={`fy-product-shell ${className}`.trim()}>
      <a className="fy-skip-link" href="#fy-main-content">Skip to page content</a>
      <ProductHeader action={headerAction}/>
      <main id="fy-main-content" className="fy-product-content" data-testid={testId} tabIndex={-1}>
        {children}
      </main>
      <ProductNavigation active={active}/>
    </div>
  );
}
