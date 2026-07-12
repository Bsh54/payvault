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
import { EXPLORER, DEMO_PUBLIC_TX, DEMO_CONFIDENTIAL_TX, PAYROLL_VAULT_ADDRESS } from "./lib/payvault";

export function Landing({
  onStart,
  onAudit,
  onMyPay,
}: {
  onStart: () => void;
  onAudit: () => void;
  onMyPay: () => void;
}) {
  return (
    <div className="lp">
      {/* Sticky nav */}
      <header className="lp-nav">
        <div className="lp-brand">
          <img className="lp-logo-img" src="/payvault-logo.png" alt="PayVault" />
        </div>
        <div className="lp-nav-actions">
          <button className="lp-btn lp-btn-ghost" onClick={onMyPay}>Employees</button>
          <button className="lp-btn lp-btn-ghost" onClick={onAudit}>Auditors</button>
          <button className="lp-btn lp-btn-primary" onClick={onStart}>
            Get started <ArrowRight size={16} weight="bold" />
          </button>
        </div>
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
            PayVault keeps every wage private on the blockchain. Your auditor can
            still verify the totals. No spreadsheets, no leaks.
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

        {/* Representative product visual */}
        <div className="lp-hero-visual fade-up d2">
          <img className="lp-hero-img" src="/hero-dashboard.jpg?v=1" alt="Confidential payroll dashboard" />
          <span className="lp-hero-badge"><LockKey size={14} weight="fill" /> Salaries encrypted on-chain</span>
        </div>
      </section>

      {/* Before / After proof on the public explorer */}
      <section className="lp-ba">
        <a className="lp-card lp-ba-card" href={`${EXPLORER}/tx/${DEMO_PUBLIC_TX}`} target="_blank" rel="noreferrer">
          <div className="lp-ba-head">
            <Eye size={20} weight="bold" /> <span>A normal payment</span>
          </div>
          <img className="lp-ba-shot" src="/normal-payement.png?v=2" alt="Public transaction on Etherscan, amount visible" />
          <span className="lp-ba-link">View on Etherscan <ArrowRight size={14} /></span>
        </a>

        <div className="lp-ba-arrow"><ArrowRight size={26} weight="bold" /></div>

        <a className="lp-card lp-ba-card" href={`${EXPLORER}/tx/${DEMO_CONFIDENTIAL_TX}`} target="_blank" rel="noreferrer">
          <div className="lp-ba-head">
            <EyeSlash size={20} weight="bold" /> <span>With PayVault</span>
          </div>
          <img className="lp-ba-shot" src="/encrypted.png?v=2" alt="Confidential transaction on Etherscan, amount hidden" />
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
              <p>Top up your vault with your monthly budget. The public chain shows <strong>one total</strong>, never who gets what.</p>
            </div>
          </div>
          <div className="lp-tl-item">
            <span className="lp-tl-icon"><LockKey size={22} weight="duotone" /></span>
            <div>
              <h3>Set salaries privately</h3>
              <p>Each amount is <strong>encrypted the moment you enter it</strong>. Nobody can read the numbers on the public chain.</p>
            </div>
          </div>
          <div className="lp-tl-item">
            <span className="lp-tl-icon"><SealCheck size={22} weight="duotone" /></span>
            <div>
              <h3>Your team gets paid</h3>
              <p>Employees receive their pay privately. <strong>Each person sees only their own amount</strong>, and no one else's.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Selective disclosure — split feature (distinct family) */}
      <section className="lp-feature" id="feature">
        <span className="lp-feature-icon"><Faders size={26} weight="duotone" /></span>
        <div>
          <h2>Private for your team. Clear for your auditor.</h2>
          <p>
            Give your auditor read access to the <strong>total payroll</strong>, never to
            individual salaries. Privacy <em>and</em> compliance, finally together.
          </p>
        </div>
      </section>

      {/* Built with — scrolling marquee */}
      <section className="lp-trust">
        <span className="lp-trust-label">Built with</span>
        <div className="lp-marquee">
          <div className="lp-marquee-track">
            {[0, 1].map((dup) => (
              <div className="lp-marquee-group" key={dup} aria-hidden={dup === 1}>
                <span className="lp-logo-chip">
                  <img src="https://cdn.simpleicons.org/ethereum/EAF0FA" width={20} height={20} alt="Ethereum" />
                  Ethereum
                </span>
                <span className="lp-logo-chip">
                  <img src="https://cdn.simpleicons.org/solidity/EAF0FA" width={20} height={20} alt="Solidity" />
                  Solidity
                </span>
                <span className="lp-logo-chip">
                  <span className="lp-logo-monogram" style={{ background: "linear-gradient(135deg,#FFD54A,#FF9F1C)" }}>iX</span>
                  iExec · Nox
                </span>
                <span className="lp-logo-chip">
                  <span className="lp-logo-monogram" style={{ background: "linear-gradient(135deg,#F97362,#F04E37)" }}>S</span>
                  Sablier
                </span>
                <span className="lp-logo-chip">
                  <img src="https://cdn.simpleicons.org/typescript/EAF0FA" width={20} height={20} alt="TypeScript" />
                  TypeScript
                </span>
                <span className="lp-logo-chip">
                  <img src="https://cdn.simpleicons.org/react/EAF0FA" width={20} height={20} alt="React" />
                  React
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Classic footer */}
      <footer className="lp-footer">
        <div className="lp-footer-top">
          <div className="lp-footer-brand">
            <div className="lp-brand">
              <span className="lp-logo-mark"><ShieldCheck weight="fill" size={19} /></span>
              <span>PayVault</span>
            </div>
            <p>Confidential payroll on Ethereum. Pay your team without exposing salaries.</p>
          </div>
          <div className="lp-footer-cols">
            <div className="lp-footer-col">
              <h4>Access</h4>
              <button className="lp-footer-link" onClick={onStart}>For companies</button>
              <button className="lp-footer-link" onClick={onAudit}>For auditors</button>
              <button className="lp-footer-link" onClick={onMyPay}>For employees</button>
            </div>
            <div className="lp-footer-col">
              <h4>Product</h4>
              <a href="#how">How it works</a>
              <button className="lp-footer-link" onClick={onStart}>Open the app</button>
            </div>
            <div className="lp-footer-col">
              <h4>Resources</h4>
              <a href="https://github.com/Bsh54/payvault" target="_blank" rel="noreferrer">GitHub</a>
              <a href={`${EXPLORER}/address/${PAYROLL_VAULT_ADDRESS}`} target="_blank" rel="noreferrer">Smart contract</a>
              <a href="https://docs.noxprotocol.io" target="_blank" rel="noreferrer">Nox docs</a>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© 2026 PayVault</span>
          <span>Built for the iExec WTF Hackathon</span>
        </div>
      </footer>
    </div>
  );
}
