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
          <h1 className="fade-up d1">
            Pay your team without
            <br />
            <span className="grad-text">exposing salaries.</span>
          </h1>
          <p className="lp-sub fade-up d2">
            PayVault keeps every wage private on the blockchain — while your
            auditor can still verify the totals. No spreadsheets, no leaks.
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
          <h2>Three steps. Zero salaries leaked.</h2>
        </div>
        <div className="lp-timeline">
          <div className="lp-tl-item">
            <span className="lp-tl-icon"><Money size={22} weight="duotone" /></span>
            <div>
              <h3>Fund your payroll</h3>
              <p>Top up your vault with your monthly budget. The public chain shows <strong>one total</strong> — never who gets what.</p>
            </div>
          </div>
          <div className="lp-tl-item">
            <span className="lp-tl-icon"><LockKey size={22} weight="duotone" /></span>
            <div>
              <h3>Set salaries privately</h3>
              <p>Each amount is <strong>encrypted the moment you enter it</strong>. Nobody can read the numbers on-chain.</p>
            </div>
          </div>
          <div className="lp-tl-item">
            <span className="lp-tl-icon"><SealCheck size={22} weight="duotone" /></span>
            <div>
              <h3>Your team gets paid</h3>
              <p>Employees receive their pay privately. <strong>Each person sees only their own amount</strong> — no one else's.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Selective disclosure — split feature (distinct family) */}
      <section className="lp-feature">
        <span className="lp-feature-icon"><Faders size={26} weight="duotone" /></span>
        <div>
          <h2>Private for your team. Clear for your auditor.</h2>
          <p>
            Give your auditor read-access to the <strong>total payroll</strong> — never to
            individual salaries. Privacy <em>and</em> compliance, finally together.
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
        <h2>Start paying your team privately.</h2>
        <p>Connect your wallet — no password, no exposed data. Free on Ethereum testnet.</p>
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
