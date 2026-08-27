import Image from "next/image";
import Link from "next/link";
import { FiChevronRight, FiDollarSign, FiSettings } from "react-icons/fi";
import type { BrowserSupabaseConfiguration } from "../../auth/browser-supabase-client";
import { SignOutButton } from "../../auth/sign-out-button";
import { ProductShell } from "../../product-shell/product-shell";

export function ProfileSurface({
  displayName,
  personalEmail,
  configuration
}: Readonly<{
  displayName: string;
  personalEmail: string | null;
  configuration: BrowserSupabaseConfiguration;
}>) {
  return (
    <ProductShell active={null} className="fy-profile-shell" testId="profile-surface">
      <header className="fy-account-heading">
        <h1>Profile</h1>
      </header>

      <section className="fy-profile-identity" aria-label="Your account">
        <Image src="/images/sarah-profile.png" alt="" width={96} height={96} priority/>
        <div>
          <h2>{displayName}</h2>
          {personalEmail ? <p>{personalEmail}</p> : null}
        </div>
      </section>

      <section className="fy-account-section" aria-labelledby="profile-options-title">
        <h2 id="profile-options-title">Account</h2>
        <nav className="fy-settings-list" aria-label="Profile options">
          <Link href="/profile/financial-context">
            <span className="fy-settings-icon" aria-hidden="true"><FiDollarSign/></span>
            <span className="fy-settings-copy"><strong>Financial context</strong><small>Everything Future You knows about your money</small></span>
            <FiChevronRight className="fy-settings-chevron" aria-hidden="true"/>
          </Link>
          <Link href="/profile/settings">
            <span className="fy-settings-icon" aria-hidden="true"><FiSettings/></span>
            <span className="fy-settings-copy"><strong>Settings</strong><small>Account and financial plan</small></span>
            <FiChevronRight className="fy-settings-chevron" aria-hidden="true"/>
          </Link>
        </nav>
      </section>

      <div className="fy-profile-sign-out"><SignOutButton configuration={configuration}/></div>
    </ProductShell>
  );
}
