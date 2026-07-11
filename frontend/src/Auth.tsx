import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  ShieldCheck,
  Wallet,
  ArrowRight,
  Buildings,
  CheckCircle,
  ArrowLeft,
} from "@phosphor-icons/react";

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export function Auth({
  onEnter,
  onBack,
}: {
  onEnter: (companyName: string) => void;
  onBack: () => void;
}) {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [name, setName] = useState("");

  useEffect(() => {
    if (address) {
      const saved = localStorage.getItem(`payvault:company:${address.toLowerCase()}`);
      if (saved) setName(saved);
    }
  }, [address]);

  function enter(companyName: string) {
    if (address && companyName.trim()) {
      localStorage.setItem(`payvault:company:${address.toLowerCase()}`, companyName.trim());
    }
    onEnter(companyName.trim());
  }

  return (
    <div className="lp auth-split">
      {/* Left — representative image with overlay text */}
      <div className="auth-left">
        <button className="auth-back" onClick={onBack}>
          <ArrowLeft size={16} weight="bold" /> Back
        </button>
        <div className="auth-left-overlay">
          <div className="lp-brand">
            <span className="lp-logo-mark"><ShieldCheck weight="fill" size={19} /></span>
            <span>PayVault</span>
          </div>
          <div className="auth-left-text">
            <h2>Confidential payroll, on-chain.</h2>
            <p>
              Pay your team without exposing salaries. Verifiable by auditors,
              invisible to everyone else.
            </p>
          </div>
        </div>
      </div>

      {/* Right — the action */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="lp-brand auth-brand-mobile">
            <span className="lp-logo-mark"><ShieldCheck weight="fill" size={19} /></span>
            <span>PayVault</span>
          </div>

          {!address ? (
            <>
              <h1>Sign in to your company space</h1>
              <button className="lp-btn lp-btn-primary lp-btn-lg auth-connect" onClick={openConnectModal}>
                <Wallet size={18} weight="bold" /> Connect wallet
              </button>
            </>
          ) : (
            <>
              <span className="auth-connected"><CheckCircle size={15} weight="fill" /> Connected {short(address)}</span>
              <h1>Name your company</h1>
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
      </div>
    </div>
  );
}
