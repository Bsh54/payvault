import { useEffect, useState } from "react";
import { isAddress, formatUnits, parseUnits, type Address } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Buildings,
  MagnifyingGlass,
  Wallet,
  LockKey,
  LockKeyOpen,
  CurrencyDollar,
  UsersThree,
  Money,
  ShieldCheck,
  House,
  ArrowLeft,
  ArrowSquareOut,
  PencilSimple,
  SquaresFour,
  ArrowRight,
  EyeSlash,
  Check,
  CircleNotch,
  CheckCircle,
  XCircle,
} from "@phosphor-icons/react";
import {
  readVault,
  handleClient,
  decryptWithRetry,
  publicClient,
  sendVaultTx,
  sendTo,
  ZERO_HANDLE,
} from "./lib/wallet";
import {
  PAYROLL_VAULT_ADDRESS,
  PAYUSD_ADDRESS,
  SABLIER_ADDRESS,
  PAYUSD_ABI,
  SABLIER_ABI,
  EXPLORER,
  DEMO_PUBLIC_TX,
  DEMO_CONFIDENTIAL_TX,
  DEMO_COMPANY,
} from "./lib/payvault";
import { Landing } from "./Landing";

type Section = "overview" | "payroll" | "funding" | "auditors" | "mypay";

const TITLES: Record<Section, string> = {
  overview: "Overview",
  payroll: "Payroll",
  funding: "Funding",
  auditors: "Auditors",
  mypay: "My pay",
};

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export function App() {
  const { address } = useAccount();
  const [section, setSection] = useState<Section>("overview");
  const routeFromHash = (): "landing" | "app" | "verify" => {
    const h = window.location.hash;
    if (h.includes("app")) return "app";
    if (h.includes("verify")) return "verify";
    return "landing";
  };
  const [view, setView] = useState<"landing" | "app" | "verify">(routeFromHash);
  const [company, setCompany] = useState<string>("");
  const [editingCompany, setEditingCompany] = useState(false);

  useEffect(() => {
    const onHash = () => setView(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function go(v: "landing" | "app" | "verify") {
    const hash = v === "app" ? "#/app" : v === "verify" ? "#/verify" : "#/";
    if (window.location.hash !== hash) window.location.hash = hash;
    setView(v);
  }

  useEffect(() => {
    if (address) {
      const saved = localStorage.getItem(`payvault:company:${address.toLowerCase()}`);
      setCompany(saved || "");
    }
  }, [address]);

  function saveCompany(v: string) {
    setCompany(v);
    if (address) localStorage.setItem(`payvault:company:${address.toLowerCase()}`, v);
  }

  if (view === "landing") {
    return <Landing onStart={() => go("app")} onVerify={() => go("verify")} />;
  }

  if (view === "verify") {
    return <VerifyPage onBack={() => go("landing")} />;
  }

  const NavItem = ({ id, icon }: { id: Section; icon: React.ReactNode }) => (
    <button className={`side-item ${section === id ? "on" : ""}`} onClick={() => setSection(id)}>
      {icon} <span>{TITLES[id]}</span>
    </button>
  );

  return (
    <div className="dash">
      <aside className="sidebar">
        <div className="side-brand">
          <span className="side-logo-mark"><ShieldCheck weight="fill" size={18} /></span>
          <span className="side-logo">PayVault</span>
        </div>
        {address && (
          <div className="side-company-box">
            {editingCompany ? (
              <input
                autoFocus
                className="side-company"
                placeholder="Company name"
                value={company}
                onChange={(e) => saveCompany(e.target.value)}
                onBlur={() => setEditingCompany(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingCompany(false)}
              />
            ) : company ? (
              <button className="side-company-label" onClick={() => setEditingCompany(true)}>
                <span>{company}</span>
                <PencilSimple size={13} />
              </button>
            ) : (
              <button className="side-company-add" onClick={() => setEditingCompany(true)}>
                + Name your company
              </button>
            )}
          </div>
        )}

        <nav className="side-nav">
          <div className="side-group">Overview</div>
          <NavItem id="overview" icon={<SquaresFour size={18} weight="bold" />} />

          <div className="side-group">Company</div>
          <NavItem id="funding" icon={<Money size={18} weight="bold" />} />
          <NavItem id="payroll" icon={<Buildings size={18} weight="bold" />} />
          <NavItem id="auditors" icon={<MagnifyingGlass size={18} weight="bold" />} />

          <div className="side-group">Employee</div>
          <NavItem id="mypay" icon={<Wallet size={18} weight="bold" />} />
        </nav>

        <button className="side-home" onClick={() => go("landing")}>
          <House size={17} weight="bold" /> Home
        </button>
      </aside>

      <div className="content">
        <header className="content-top">
          <h1>{TITLES[section]}</h1>
          <div className="content-top-right">
            <a
              className="verify-link"
              href={`${EXPLORER}/address/${address ?? PAYROLL_VAULT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              title="View this wallet's authentic on-chain record on Etherscan"
            >
              <ArrowSquareOut size={15} weight="bold" /> Verify on-chain
            </a>
            <ConnectButton
              accountStatus="address"
              chainStatus="icon"
              showBalance={{ smallScreen: false, largeScreen: true }}
            />
          </div>
        </header>

        <main className="content-main">
          {section === "overview" && <OverviewPanel onGo={setSection} />}
          {section === "payroll" && <PayrollPanel />}
          {section === "funding" && <FundingPanel />}
          {section === "auditors" && <AuditorsPanel />}
          {section === "mypay" && <EmployeePanel />}
        </main>
      </div>
    </div>
  );
}

/* ---------------- Overview (home) ---------------- */

function OverviewPanel({ onGo }: { onGo: (s: Section) => void }) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [count, setCount] = useState(0);
  const [budget, setBudget] = useState<bigint>(0n);
  const [streamId, setStreamId] = useState<bigint>(0n);
  const [total, setTotal] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!address) return;
      try {
        const c = readVault();
        setCount(Number((await c.read.employeeCount([address])) as bigint));
        setBudget((await c.read.publicBudget([address])) as bigint);
        setStreamId((await c.read.sablierStreamId([address])) as bigint);
      } catch {
        /* ignore */
      }
    })();
  }, [address]);

  if (!address)
    return (
      <div className="card center">
        <p>Connect your wallet to see your payroll overview.</p>
        <ConnectButton />
      </div>
    );

  const funded = budget > 0n;
  const hasEmployees = count > 0;

  async function decryptTotal() {
    if (!walletClient) return;
    setBusy(true);
    try {
      const handle = (await readVault().read.totalPayrollHandle([address!])) as `0x${string}`;
      if (handle === ZERO_HANDLE) return setTotal("0");
      setTotal((await decryptWithRetry(walletClient, handle)).toString());
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  const Step = ({ n, title, desc, cta, to }: any) => (
    <button className="step-row" onClick={() => onGo(to)}>
      <span className="step-num">{n}</span>
      <span className="step-body">
        <span className="step-title">{title}</span>
        <span className="step-desc">{desc}</span>
      </span>
      <span className="step-cta">{cta} <ArrowRight size={15} weight="bold" /></span>
    </button>
  );

  return (
    <>
      <div className="kpis kpis-4">
        <div className="kpi">
          <span className="kpi-icon"><Money size={20} weight="bold" /></span>
          <div>
            <span className="kpi-value">{funded ? formatUnits(budget, 18) : "—"}</span>
            <span className="kpi-label">Funding budget (PayUSD)</span>
          </div>
        </div>
        <div className="kpi">
          <span className="kpi-icon"><UsersThree size={20} weight="bold" /></span>
          <div>
            <span className="kpi-value">{count}</span>
            <span className="kpi-label">Employees</span>
          </div>
        </div>
        <div className="kpi">
          <span className="kpi-icon"><LockKey size={20} weight="bold" /></span>
          <div>
            <span className="kpi-value">
              {total !== "" ? total : (
                <button className="reveal-eye" disabled={busy} onClick={decryptTotal} title="Reveal the amount">
                  <EyeSlash size={22} weight="bold" />
                </button>
              )}
            </span>
            <span className="kpi-label">Total payroll</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Get started</h3>
        <p className="muted">Set up confidential payroll in three steps.</p>
        <div className="steps">
          <Step done={funded} n={1} title="Fund payroll" to="funding"
            desc={funded ? `Funded via Sablier stream #${streamId.toString()}` : "Deposit your budget through a public Sablier stream"} cta="Fund" />
          <Step done={hasEmployees} n={2} title="Add employees" to="payroll"
            desc={hasEmployees ? `${count} employee${count > 1 ? "s" : ""} on payroll` : "Register employees with encrypted salaries"} cta="Add" />
          <Step done={false} n={3} title="Run payroll" to="payroll"
            desc="Pay everyone a confidential balance in one click" cta="Pay" />
        </div>
      </div>
    </>
  );
}

/* ---------------- Public verification page (standalone, no wallet) ---------------- */

function VerifyPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="lp verify">
      <header className="lp-nav">
        <button className="auth-back" onClick={onBack}>
          <ArrowLeft size={16} weight="bold" /> Home
        </button>
        <a
          className="lp-btn lp-btn-ghost"
          href={`${EXPLORER}/address/${PAYROLL_VAULT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          Contract on Etherscan <ArrowSquareOut size={15} weight="bold" />
        </a>
      </header>

      <section className="verify-hero">
        <span className="eyebrow">Public · no account needed</span>
        <h1>Verify PayVault on-chain.</h1>
        <p className="lp-sub">
          Anyone can independently check that salaries are encrypted. Inspect any
          company below, or read the contract directly on the Ethereum explorer.
        </p>
        <a
          className="lp-btn lp-btn-primary lp-btn-lg"
          href={`${EXPLORER}/address/${PAYROLL_VAULT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          Open contract on Etherscan <ArrowSquareOut size={17} weight="bold" />
        </a>
      </section>

      <section className="verify-body">
        <PublicPanel defaultCompany={DEMO_COMPANY as Address} />
      </section>
    </div>
  );
}

/* ---------------- Payroll ---------------- */

function PayrollPanel() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [emp, setEmp] = useState("");
  const [salary, setSalary] = useState("");
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [employees, setEmployees] = useState<Address[]>([]);
  const [total, setTotal] = useState<string>("");
  const [reveal, setReveal] = useState<Record<string, string>>({});

  async function refresh() {
    if (!address) return;
    try {
      const list = (await readVault().read.employees([address])) as Address[];
      setEmployees([...list]);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    refresh();
  }, [address]);

  if (!address)
    return (
      <div className="card center">
        <p>Connect your wallet to manage your company payroll.</p>
        <ConnectButton />
      </div>
    );

  async function addEmployee() {
    setResult(null);
    if (!isAddress(emp, { strict: false }))
      return setResult({ ok: false, msg: "Invalid employee address." });
    let amount: bigint;
    try {
      amount = BigInt(salary);
      if (amount <= 0n) throw new Error();
    } catch {
      return setResult({ ok: false, msg: "Enter a positive salary." });
    }
    if (!walletClient) return setResult({ ok: false, msg: "Wallet not ready." });
    setBusy(true);
    try {
      const hc = await handleClient(walletClient);
      const { handle, handleProof } = await hc.encryptInput(amount, "uint256", PAYROLL_VAULT_ADDRESS);
      const tx = await sendVaultTx(walletClient, "addEmployee", [emp as Address, handle, handleProof]);
      await publicClient().waitForTransactionReceipt({ hash: tx });
      setResult({ ok: true, msg: "Employee added." });
      setEmp("");
      setSalary("");
      refresh();
    } catch (e: any) {
      setResult({ ok: false, msg: e.shortMessage || e.message || String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function decryptTotal() {
    if (!walletClient) return;
    setBusy(true);
    setResult(null);
    try {
      const handle = (await readVault().read.totalPayrollHandle([address!])) as `0x${string}`;
      if (handle === ZERO_HANDLE) {
        setTotal("0");
        return;
      }
      const v = await decryptWithRetry(walletClient, handle);
      setTotal(v.toString());
    } catch (e: any) {
      setResult({ ok: false, msg: e.message || String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function revealSalary(e: Address) {
    if (!walletClient) return;
    setReveal((r) => ({ ...r, [e]: "…" }));
    try {
      const handle = (await readVault().read.salaryHandleOf([address!, e])) as `0x${string}`;
      const v = await decryptWithRetry(walletClient, handle);
      setReveal((r) => ({ ...r, [e]: v.toString() }));
    } catch {
      setReveal((r) => ({ ...r, [e]: "denied" }));
    }
  }

  async function runPayroll() {
    if (!walletClient) return;
    setBusy(true);
    setResult(null);
    try {
      const tx = await sendVaultTx(walletClient, "runPayroll", []);
      await publicClient().waitForTransactionReceipt({ hash: tx });
      setResult({ ok: true, msg: "Payroll paid." });
    } catch (e: any) {
      setResult({ ok: false, msg: e.shortMessage || e.message || String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="grid">
        <div className="card">
          <h3>Add an employee</h3>
          <label>Employee wallet</label>
          <input placeholder="0x…" value={emp} onChange={(e) => setEmp(e.target.value)} />
          <label>Monthly salary (confidential)</label>
          <div className="amount-field">
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            />
            <span className="amount-suffix">PayUSD</span>
          </div>
          <button className="btn btn-block" disabled={busy} onClick={addEmployee}>
            {busy ? (
              <><CircleNotch size={17} weight="bold" className="spin" /> Adding…</>
            ) : (
              <><LockKey size={17} weight="bold" /> Encrypt & add</>
            )}
          </button>
        </div>

        <div className="card">
          <h3>Payroll actions</h3>
          <p className="muted">Decrypt your own aggregate, or pay every employee a confidential balance.</p>
          <div className="stack">
            <button className="btn ghost" disabled={busy} onClick={decryptTotal}>
              <LockKeyOpen size={17} weight="bold" /> Decrypt total{total !== "" ? `: ${total}` : ""}
            </button>
            <button className="btn" disabled={busy || employees.length === 0} onClick={runPayroll}>
              <CurrencyDollar size={17} weight="bold" /> Run payroll
            </button>
          </div>
        </div>

        <div className="card wide">
          <h3>Employees ({employees.length})</h3>
          {employees.length === 0 ? (
            <p className="muted">No employees yet. Add your first one above.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Employee</th><th>Salary</th><th></th></tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e}>
                    <td className="mono">{short(e)}</td>
                    <td className="mono">
                      {reveal[e] ? (reveal[e] === "denied" ? "Denied" : reveal[e]) : "Encrypted"}
                    </td>
                    <td>
                      <button className="link" onClick={() => revealSalary(e)}>reveal</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {result && (
          <div style={{ gridColumn: "1 / -1" }}>
            <ResultBanner ok={result.ok}>{result.msg}</ResultBanner>
          </div>
        )}
      </div>
    </>
  );
}

/* Animated success / error banner (no emojis) */
function ResultBanner({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className={`result ${ok ? "ok" : "err"}`}>
      <span className="result-icon">
        {ok ? <CheckCircle size={44} weight="fill" /> : <XCircle size={44} weight="fill" />}
      </span>
      <span className="result-msg">{children}</span>
    </div>
  );
}

/* ---------------- Funding ---------------- */

function FundingPanel() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [streamId, setStreamId] = useState<bigint>(0n);
  const [budget, setBudget] = useState<bigint>(0n);
  const [amount, setAmount] = useState("120000");
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);

  const FUND_STEPS = ["Mint PayUSD", "Approve Sablier", "Create stream", "Record funding"];

  async function refresh() {
    if (!address) return;
    try {
      const c = readVault();
      setStreamId((await c.read.sablierStreamId([address])) as bigint);
      setBudget((await c.read.publicBudget([address])) as bigint);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    refresh();
  }, [address]);

  if (!address)
    return (
      <div className="card center">
        <p>Connect your wallet to fund your payroll.</p>
        <ConnectButton />
      </div>
    );

  async function fund() {
    setResult(null);
    let value: bigint;
    try {
      value = parseUnits(amount || "0", 18);
      if (value <= 0n) throw new Error();
    } catch {
      return setResult({ ok: false, msg: "Enter a positive budget amount." });
    }
    if (!walletClient) return setResult({ ok: false, msg: "Wallet not ready." });
    const wait = async (p: Promise<`0x${string}`>) => {
      const h = await p;
      await publicClient().waitForTransactionReceipt({ hash: h });
      return h;
    };
    setBusy(true);
    setResult(null);
    try {
      setStep(1);
      await wait(sendTo(walletClient, PAYUSD_ADDRESS, PAYUSD_ABI, "mint", [address!, value]));

      setStep(2);
      await wait(sendTo(walletClient, PAYUSD_ADDRESS, PAYUSD_ABI, "approve", [SABLIER_ADDRESS, value]));

      setStep(3);
      const nextId = (await publicClient().readContract({
        address: SABLIER_ADDRESS, abi: SABLIER_ABI, functionName: "nextStreamId",
      })) as bigint;
      const params = {
        sender: address!, recipient: PAYROLL_VAULT_ADDRESS, depositAmount: value,
        token: PAYUSD_ADDRESS, cancelable: true, transferable: true, shape: "PayVault confidential payroll",
      };
      await wait(sendTo(walletClient, SABLIER_ADDRESS, SABLIER_ABI, "createWithDurationsLL", [
        params, { start: 0n, cliff: 0n }, 0, { cliff: 0, total: 30 * 24 * 60 * 60 },
      ]));

      setStep(4);
      await wait(sendVaultTx(walletClient, "linkFunding", [nextId, value]));

      setStep(5);
      setResult({ ok: true, msg: "Payroll funded." });
      refresh();
    } catch (e: any) {
      setResult({ ok: false, msg: e.shortMessage || e.message || String(e) });
    } finally {
      setBusy(false);
      setStep(0);
    }
  }

  return (
    <div className="card">
      <h3>Public funding (Sablier)</h3>
      {streamId > 0n && (
        <div className="public-out" style={{ marginBottom: 20 }}>
          <div className="stat">
            <span className="big">#{streamId.toString()}</span>
            <span>Sablier stream</span>
          </div>
          <div className="stat">
            <span className="big">{formatUnits(budget, 18)}</span>
            <span>PayUSD budget (public)</span>
          </div>
        </div>
      )}

      <label>Amount to deposit</label>
      <div className="amount-field">
        <input
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <span className="amount-suffix">PayUSD</span>
      </div>
      <div className="amount-presets">
        {["50000", "100000", "200000"].map((p) => (
          <button
            key={p}
            className={`chip ${amount === p ? "on" : ""}`}
            onClick={() => setAmount(p)}
          >
            {Number(p).toLocaleString()}
          </button>
        ))}
      </div>

      {busy ? (
        <div className="fund-steps">
          {FUND_STEPS.map((s, i) => {
            const n = i + 1;
            const state = step > n ? "done" : step === n ? "active" : "";
            return (
              <div key={s} className={`fund-step ${state}`}>
                <span className="fund-step-dot">
                  {step > n ? <Check size={13} weight="bold" /> : step === n ? <CircleNotch size={13} weight="bold" className="spin" /> : n}
                </span>
                <span>{s}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <button className="btn btn-block" onClick={fund}>
          <Money size={17} weight="bold" /> {streamId > 0n ? "Add funds" : "Fund payroll"}
        </button>
      )}

      {result && <ResultBanner ok={result.ok}>{result.msg}</ResultBanner>}
    </div>
  );
}

/* ---------------- Auditors ---------------- */

function AuditorsPanel() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [auditor, setAuditor] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  if (!address)
    return (
      <div className="card center">
        <p>Connect your wallet to grant auditor access.</p>
        <ConnectButton />
      </div>
    );

  async function grantAuditor() {
    setStatus("");
    if (!isAddress(auditor, { strict: false }))
      return setStatus("❌ Invalid auditor address (need 0x + 40 hex chars)");
    if (!walletClient) return;
    setBusy(true);
    try {
      setStatus("Granting auditor access to the aggregate…");
      const tx = await sendVaultTx(walletClient, "grantAuditor", [auditor as Address]);
      await publicClient().waitForTransactionReceipt({ hash: tx });
      setStatus(`✅ Auditor ${short(auditor)} can now verify the total, not individual salaries.`);
      setAuditor("");
    } catch (e: any) {
      setStatus("❌ " + (e.shortMessage || e.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>Grant an auditor</h3>
      <p className="muted">
        The auditor will be able to decrypt the <strong>aggregate</strong> payroll only, never
        individual salaries. This is selective disclosure: privacy and compliance together.
      </p>
      <label>Auditor wallet</label>
      <input placeholder="0x…" value={auditor} onChange={(e) => setAuditor(e.target.value)} />
      <button className="btn" disabled={busy} onClick={grantAuditor}>
        <ShieldCheck size={17} weight="bold" /> Grant aggregate access
      </button>
      {status && <div className="status">{status}</div>}
    </div>
  );
}

/* ---------------- Public ---------------- */

function PublicPanel({ defaultCompany }: { defaultCompany?: Address }) {
  const [company, setCompany] = useState<string>(defaultCompany || "");
  const [count, setCount] = useState<number | null>(null);
  const [init, setInit] = useState<boolean | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (defaultCompany) setCompany(defaultCompany);
  }, [defaultCompany]);

  async function look() {
    setStatus("");
    if (!isAddress(company, { strict: false }))
      return setStatus("❌ Invalid company address (need 0x + 40 hex chars)");
    try {
      const c = readVault();
      const n = (await c.read.employeeCount([company as Address])) as bigint;
      const i = (await c.read.isInitialized([company as Address])) as boolean;
      setCount(Number(n));
      setInit(i);
    } catch (e: any) {
      setStatus("❌ " + (e.message || String(e)));
    }
  }

  return (
    <div className="card">
      <h3>What the public sees</h3>
      <p className="muted">
        Anyone can read the chain. Here is <em>everything</em> a public observer learns about a
        company's payroll. Notice there are <strong>no amounts</strong>.
      </p>
      <label>Company wallet</label>
      <div className="row">
        <input placeholder="0x…" value={company} onChange={(e) => setCompany(e.target.value)} />
        <button className="btn" onClick={look}>Inspect</button>
      </div>
      {count !== null && (
        <div className="public-out">
          <div className="stat">
            <span className="big">{count}</span>
            <span>employees on payroll</span>
          </div>
          <div className="stat">
            <span className="big">{init ? "Active" : "None"}</span>
            <span>payroll status</span>
          </div>
          <div className="stat">
            <span className="big">Hidden</span>
            <span>salary amounts (encrypted)</span>
          </div>
        </div>
      )}

      <div className="beforeafter">
        <h4>See it on the public block explorer</h4>
        <div className="ba-grid">
          <a className="ba-card before" href={`${EXPLORER}/tx/${DEMO_PUBLIC_TX}`} target="_blank" rel="noreferrer">
            <span className="ba-tag">Normal payment</span>
            <span className="ba-amt">5,000 visible</span>
            <span className="ba-note">A plain transfer. Anyone reads the amount.</span>
          </a>
          <a className="ba-card after" href={`${EXPLORER}/tx/${DEMO_CONFIDENTIAL_TX}`} target="_blank" rel="noreferrer">
            <span className="ba-tag">With PayVault</span>
            <span className="ba-amt">Encrypted</span>
            <span className="ba-note">Same operation. The salary is an unreadable handle.</span>
          </a>
        </div>
      </div>

      {status && <div className="status">{status}</div>}
    </div>
  );
}

/* ---------------- Employee ---------------- */

function EmployeePanel() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [pay, setPay] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  if (!address)
    return (
      <div className="card center">
        <p>Connect your employee wallet to see your confidential pay.</p>
        <ConnectButton />
      </div>
    );

  async function decryptPay() {
    if (!walletClient) return;
    setBusy(true);
    setStatus("Decrypting your confidential pay…");
    try {
      const handle = (await readVault().read.confidentialBalanceOf([address!])) as `0x${string}`;
      if (handle === ZERO_HANDLE) {
        setStatus("No pay received yet (ask your company to run payroll).");
        return;
      }
      const v = await decryptWithRetry(walletClient, handle);
      setPay(v.toString());
      setStatus("✅ Only you can read this. It is encrypted for everyone else.");
    } catch {
      setStatus("Nothing to decrypt yet, or access not granted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>My confidential pay</h3>
      <p className="muted">
        Connected as <span className="mono">{short(address)}</span>. Your received pay is held as a
        confidential <strong>cPAY</strong> balance (ERC-7984), encrypted on-chain. Only you can decrypt it.
      </p>
      <button className="btn" disabled={busy} onClick={decryptPay}>
        <LockKeyOpen size={17} weight="bold" /> Decrypt my pay
      </button>
      {pay && (
        <div className="public-out">
          <div className="stat">
            <span className="big">{pay}</span>
            <span>your confidential pay (cPAY)</span>
          </div>
        </div>
      )}
      {status && <div className="status">{status}</div>}
    </div>
  );
}
