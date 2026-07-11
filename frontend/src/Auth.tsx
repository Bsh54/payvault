import { useEffect, useState } from "react";
import type { Address } from "viem";
import {
  ShieldCheck,
  Wallet,
  ArrowRight,
  Buildings,
  LockKey,
  CheckCircle,
  ArrowLeft,
} from "@phosphor-icons/react";

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export function Auth({
  account,
  onConnect,
  onEnter,
  onBack,
}: {
  account?: Address;
  onConnect: () => void;
  onEnter: (companyName: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // Prefill company name if this wallet already onboarded.
  useEffect(() => {
    if (account) {
      const saved = localStorage.getItem(`payvault:company:${account.toLowerCase()}`);
      if (saved) setName(saved);
    }
  }, [account]);

  async function connect() {
    setBusy(true);
    try {
      await onConnect();
    } finally {
      setBusy(false);
    }
  }

  function enter(companyName: string) {
    if (account && companyName.trim()) {
      localStorage.setItem(`payvault:company:${account.toLowerCase()}`, companyName.trim());
    }
    onEnter(companyName.trim());
  }

  return (
    <div className="lp auth">
      <button className="auth-back" onClick={onBack}>
        <ArrowLeft size={16} weight="bold" /> Back
      </button>

      <div className="auth-card lp-card fade-up">
        <div className="lp-brand auth-brand">
          <span className="lp-logo-mark"><ShieldCheck weight="fill" size={19} /></span>
          <span>PayVault</span>
        </div>

        {!account ? (
          <>
            <h1>Sign in to your company space</h1>
            <p className="auth-sub">
              No password, no email. Your wallet is your secure identity.
            </p>

            <button className="lp-btn lp-btn-primary lp-btn-lg auth-connect" disabled={busy} onClick={connect}>
              <Wallet size={18} weight="bold" /> Connect wallet
            </button>

            <ul className="auth-perks">
              <li><LockKey size={16} weight="fill" /> Secured by your wallet signature</li>
              <li><CheckCircle size={16} weight="fill" /> Free on Ethereum testnet</li>
            </ul>
          </>
        ) : (
          <>
            <span className="auth-connected"><CheckCircle size={15} weight="fill" /> Connected {short(account)}</span>
            <h1>Name your company</h1>
            <p className="auth-sub">
              This label is only for your dashboard. You can change it anytime.
            </p>

            <label className="auth-label">Company name</label>
            <div className="auth-input-wrap">
              <Buildings size={18} />
              <input
                autoFocus
                placeholder="e.g. Acme Labs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enter(name)}
              />
            </div>

            <div className="auth-actions">
              <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => enter(name)}>
                Continue <ArrowRight size={18} weight="bold" />
              </button>
              <button className="lp-btn lp-btn-ghost lp-btn-lg" onClick={() => enter("")}>
                Skip
              </button>
            </div>
          </>
        )}
      </div>

      <p className="auth-foot">Deployed on ETH Sepolia · your data never leaves your wallet</p>
    </div>
  );
}
