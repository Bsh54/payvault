import {
  ShieldCheck,
  EyeSlash,
  Eye,
  LockKey,
  ArrowRight,
  Faders,
  UsersThree,
  SealCheck,
  Money,
} from "@phosphor-icons/react";
import { EXPLORER, DEMO_PUBLIC_TX, DEMO_CONFIDENTIAL_TX } from "./lib/payvault";

export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="lp">
      {/* Sticky nav */}
      <header className="lp-nav">
        <div className="lp-brand">
          <span className="lp-logo-mark">
            <ShieldCheck weight="fill" size={19} />
          </span>
          <span>PayVault</span>
        </div>
        <button className="lp-btn lp-btn-primary" onClick={onStart}>
          Get started <ArrowRight size={16} weight="bold" />
        </button>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <span className="eyebrow fade-up">Confidential payroll · Nox · Ethereum</span>
        <h1 className="fade-up d1">
          Pay your team on-chain.
          <br />
          <span className="grad-text">Without revealing salaries.</span>
        </h1>
        <p className="lp-sub fade-up d2">
          PayVault encrypts every salary with Nox — verifiable by an auditor,
          invisible to everyone else.
        </p>
        <div className="lp-cta-row fade-up d3">
          <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={onStart}>
            Get started <ArrowRight size={18} weight="bold" />
          </button>
          <a className="lp-btn lp-btn-ghost lp-btn-lg" href="#how">
            How it works
          </a>
        </div>
      </section>

      {/* Before / After proof on the public explorer */}
      <section className="lp-ba">
        <a className="lp-card lp-ba-card" href={`${EXPLORER}/tx/${DEMO_PUBLIC_TX}`} target="_blank" rel="noreferrer">
          <div className="lp-ba-head">
            <Eye size={20} weight="bold" /> <span>A normal payment</span>
          </div>
          <div className="lp-ba-amount before">5,000 <span>visible</span></div>
          <p>On a public blockchain, anyone reads the amount. Salaries are exposed to the world.</p>
          <span className="lp-ba-link">View on Etherscan <ArrowRight size={14} /></span>
        </a>

        <div className="lp-ba-arrow"><ArrowRight size={26} weight="bold" /></div>

        <a className="lp-card lp-ba-card" href={`${EXPLORER}/tx/${DEMO_CONFIDENTIAL_TX}`} target="_blank" rel="noreferrer">
          <div className="lp-ba-head">
            <EyeSlash size={20} weight="bold" /> <span>With PayVault</span>
          </div>
          <div className="lp-ba-amount after"><LockKey size={26} weight="fill" /> encrypted</div>
          <p>The same operation becomes unreadable. Only the company and the employee can access it.</p>
          <span className="lp-ba-link">View on Etherscan <ArrowRight size={14} /></span>
        </a>
      </section>

      {/* How it works */}
      <section className="lp-how" id="how">
        <div className="lp-section-head">
          <span className="eyebrow">How it works</span>
          <h2>Confidential payroll, end to end</h2>
        </div>
        <div className="lp-steps">
          <div className="lp-card lp-step">
            <span className="lp-step-icon"><Money size={24} weight="duotone" /></span>
            <h3>1 · Funding</h3>
            <p>The company funds a vault with a <strong>public Sablier stream</strong> — only the aggregate total is visible.</p>
          </div>
          <div className="lp-card lp-step">
            <span className="lp-step-icon"><LockKey size={24} weight="duotone" /></span>
            <h3>2 · Encrypted salaries</h3>
            <p>Each salary is <strong>encrypted with Nox</strong> (TEE). Amounts are never exposed on-chain.</p>
          </div>
          <div className="lp-card lp-step">
            <span className="lp-step-icon"><SealCheck size={24} weight="duotone" /></span>
            <h3>3 · Confidential payout</h3>
            <p>Employees receive a <strong>confidential balance (cPAY)</strong>. Each one sees only their own pay.</p>
          </div>
        </div>
      </section>

      {/* Selective disclosure */}
      <section className="lp-feature">
        <span className="lp-feature-icon"><Faders size={26} weight="duotone" /></span>
        <div>
          <h2>Confidential, yet auditable</h2>
          <p>
            The company can let an auditor verify the <strong>total payroll</strong> without
            ever accessing an individual salary. Privacy <em>and</em> compliance, together.
          </p>
        </div>
      </section>

      {/* Trust signals */}
      <section className="lp-trust">
        <span>Built with</span>
        <div className="lp-trust-logos">
          <span>iExec · Nox</span>
          <span>Ethereum Sepolia</span>
          <span>Sablier</span>
          <span><UsersThree size={16} weight="bold" /> Open-source</span>
        </div>
      </section>

      {/* Final CTA */}
      <section className="lp-final">
        <h2>Create your company space.</h2>
        <p>Connect your wallet — no password, no exposed data.</p>
        <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={onStart}>
          Get started <ArrowRight size={18} weight="bold" />
        </button>
      </section>

      <footer className="lp-footer">
        <span>PayVault · iExec WTF Hackathon · deployed on ETH Sepolia</span>
      </footer>
    </div>
  );
}
