import {
  ShieldCheck,
  EyeSlash,
  Eye,
  LockKey,
  ArrowRight,
  Faders,
  SealCheck,
  Money,
  CheckCircle,
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

      {/* Hero — split: copy left, live visual right */}
      <section className="lp-hero">
        <div className="lp-hero-copy">
          <span className="eyebrow fade-up">Confidential payroll · Nox · Ethereum</span>
          <h1 className="fade-up d1">
            Pay your team on-chain.
            <br />
            <span className="grad-text">Salaries stay secret.</span>
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
        </div>

        {/* Real mini-representation of a confidential payslip */}
        <div className="lp-payslip lp-card fade-up d2">
          <div className="lp-payslip-head">
            <span>Payroll · March</span>
            <span className="lp-payslip-badge"><LockKey size={13} weight="fill" /> Encrypted</span>
          </div>
          <div className="lp-payslip-row">
            <span className="mono">0x8BEE…9288</span>
            <span className="lp-enc"><LockKey size={13} /> ••• •••</span>
          </div>
          <div className="lp-payslip-row">
            <span className="mono">0x06Ef…bDf9</span>
            <span className="lp-enc"><LockKey size={13} /> ••• •••</span>
          </div>
          <div className="lp-payslip-row">
            <span className="mono">0x71E6…8025</span>
            <span className="lp-enc"><LockKey size={13} /> ••• •••</span>
          </div>
          <div className="lp-payslip-foot">
            <span><CheckCircle size={15} weight="fill" /> Auditor can verify the total</span>
          </div>
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

      {/* How it works — vertical timeline (distinct layout family) */}
      <section className="lp-how" id="how">
        <div className="lp-section-head">
          <span className="eyebrow">How it works</span>
          <h2>Confidential payroll, end to end</h2>
        </div>
        <div className="lp-timeline">
          <div className="lp-tl-item">
            <span className="lp-tl-icon"><Money size={22} weight="duotone" /></span>
            <div>
              <h3>Funding</h3>
              <p>The company funds a vault with a <strong>public Sablier stream</strong> — only the aggregate total is visible.</p>
            </div>
          </div>
          <div className="lp-tl-item">
            <span className="lp-tl-icon"><LockKey size={22} weight="duotone" /></span>
            <div>
              <h3>Encrypted salaries</h3>
              <p>Each salary is <strong>encrypted with Nox</strong> inside a TEE. Amounts are never exposed on-chain.</p>
            </div>
          </div>
          <div className="lp-tl-item">
            <span className="lp-tl-icon"><SealCheck size={22} weight="duotone" /></span>
            <div>
              <h3>Confidential payout</h3>
              <p>Employees receive a <strong>confidential balance (cPAY)</strong>. Each one sees only their own pay.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Selective disclosure — split feature (distinct family) */}
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
          <span>
            <img src="https://cdn.simpleicons.org/ethereum/9FB0C9" width={16} height={16} alt="Ethereum" />
            Ethereum
          </span>
          <span>iExec · Nox</span>
          <span>Sablier</span>
          <span>Open-source</span>
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
