import Link from "next/link";
import { FiChevronRight, FiDollarSign, FiMail } from "react-icons/fi";
import type { BrowserSupabaseConfiguration } from "../../auth/browser-supabase-client";
import { SignOutButton } from "../../auth/sign-out-button";
import { ProductShell } from "../../product-shell/product-shell";

export function SettingsSurface({
  personalEmail,
  configuration
}: Readonly<{
  personalEmail: string | null;
  configuration: BrowserSupabaseConfiguration;
}>) {
  return (
    <ProductShell active={null} className="fy-profile-shell" testId="settings-surface">
      <header className="fy-account-heading has-back-link">
        <Link href="/profile">‹ Profile</Link>
        <h1>Settings</h1>
      </header>

      <section className="fy-account-section" aria-labelledby="financial-plan-settings-title">
        <h2 id="financial-plan-settings-title">Financial plan</h2>
        <nav className="fy-settings-list" aria-label="Financial plan settings">
          <Link href="/settings/financial-context">
            <span className="fy-settings-icon" aria-hidden="true"><FiDollarSign/></span>
            <span className="fy-settings-copy">
              <strong>Update financial context</strong>
              <small>Income, regular spending, cash, pension and goals</small>
            </span>
            <FiChevronRight className="fy-settings-chevron" aria-hidden="true"/>
          </Link>
        </nav>
      </section>

      <section className="fy-account-section" aria-labelledby="account-settings-title">
        <h2 id="account-settings-title">Account</h2>
        <div className="fy-settings-list">
          <div className="fy-settings-static-row">
            <span className="fy-settings-icon" aria-hidden="true"><FiMail/></span>
            <span className="fy-settings-copy"><strong>Personal email</strong><small>{personalEmail ?? "Not available"}</small></span>
          </div>
        </div>
      </section>

      <div className="fy-profile-sign-out"><SignOutButton configuration={configuration}/></div>
    </ProductShell>
  );
}
