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
          <ShieldCheck weight="fill" size={22} className="lp-logo-icon" />
          <span>PayVault</span>
        </div>
        <button className="lp-btn lp-btn-primary" onClick={onStart}>
          Commencer <ArrowRight size={16} weight="bold" />
        </button>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <span className="lp-eyebrow">Confidential payroll · Nox · Ethereum</span>
        <h1>
          Payez vos équipes on-chain.
          <br />
          <span className="lp-accent">Sans révéler les salaires.</span>
        </h1>
        <p className="lp-sub">
          PayVault chiffre chaque salaire avec Nox — vérifiable par un auditeur,
          invisible pour tous les autres.
        </p>
        <div className="lp-cta-row">
          <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={onStart}>
            Commencer <ArrowRight size={18} weight="bold" />
          </button>
          <a className="lp-btn lp-btn-ghost lp-btn-lg" href="#how">
            Comment ça marche
          </a>
        </div>
      </section>

      {/* Problem / Solution — before / after proof */}
      <section className="lp-ba">
        <a className="lp-ba-card before" href={`${EXPLORER}/tx/${DEMO_PUBLIC_TX}`} target="_blank" rel="noreferrer">
          <div className="lp-ba-head">
            <Eye size={20} weight="bold" />
            <span>Paiement classique</span>
          </div>
          <div className="lp-ba-amount before">5,000 <span>visible</span></div>
          <p>Sur une blockchain publique, n'importe qui lit le montant. Les salaires sont exposés.</p>
          <span className="lp-ba-link">Voir sur Etherscan <ArrowRight size={14} /></span>
        </a>

        <div className="lp-ba-arrow"><ArrowRight size={26} weight="bold" /></div>

        <a className="lp-ba-card after" href={`${EXPLORER}/tx/${DEMO_CONFIDENTIAL_TX}`} target="_blank" rel="noreferrer">
          <div className="lp-ba-head">
            <EyeSlash size={20} weight="bold" />
            <span>Avec PayVault</span>
          </div>
          <div className="lp-ba-amount after"><LockKey size={26} weight="fill" /> chiffré</div>
          <p>La même opération devient illisible. Seuls l'entreprise et l'employé y accèdent.</p>
          <span className="lp-ba-link">Voir sur Etherscan <ArrowRight size={14} /></span>
        </a>
      </section>

      {/* How it works */}
      <section className="lp-how" id="how">
        <h2>Comment ça marche</h2>
        <div className="lp-steps">
          <div className="lp-step">
            <Money size={26} weight="duotone" />
            <h3>1 · Financement</h3>
            <p>L'entreprise finance un coffre avec un <strong>flux Sablier public</strong> — seul le total global est visible.</p>
          </div>
          <div className="lp-step">
            <LockKey size={26} weight="duotone" />
            <h3>2 · Salaires chiffrés</h3>
            <p>Chaque salaire est <strong>chiffré via Nox</strong> (TEE). Les montants ne sont jamais exposés on-chain.</p>
          </div>
          <div className="lp-step">
            <SealCheck size={26} weight="duotone" />
            <h3>3 · Versement confidentiel</h3>
            <p>Les employés reçoivent un <strong>solde confidentiel (cPAY)</strong>. Chacun ne voit que sa propre paie.</p>
          </div>
        </div>
      </section>

      {/* Selective disclosure highlight */}
      <section className="lp-feature">
        <div className="lp-feature-icon"><Faders size={28} weight="duotone" /></div>
        <div>
          <h2>Confidentiel, mais auditable</h2>
          <p>
            L'entreprise peut autoriser un auditeur à vérifier la <strong>masse salariale totale</strong>,
            sans jamais accéder à un salaire individuel. Confidentialité <em>et</em> conformité.
          </p>
        </div>
      </section>

      {/* Trust signals */}
      <section className="lp-trust">
        <span>Construit avec</span>
        <div className="lp-trust-logos">
          <span>iExec · Nox</span>
          <span>Ethereum Sepolia</span>
          <span>Sablier</span>
          <span><UsersThree size={16} weight="bold" /> Open-source</span>
        </div>
      </section>

      {/* Final CTA */}
      <section className="lp-final">
        <h2>Créez votre espace entreprise.</h2>
        <p>Connectez votre wallet — pas de mot de passe, pas de données exposées.</p>
        <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={onStart}>
          Commencer <ArrowRight size={18} weight="bold" />
        </button>
      </section>

      <footer className="lp-footer">
        <span>PayVault · iExec WTF Hackathon · déployé sur ETH Sepolia</span>
      </footer>
    </div>
  );
}
