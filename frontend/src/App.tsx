import { useEffect, useState } from "react";
import { isAddress, formatUnits, parseUnits, parseAbiItem, type Address } from "viem";
import { useAccount, useWalletClient, useDisconnect } from "wagmi";
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
  Eye,
  EyeSlash,
  Check,
  CircleNotch,
  CheckCircle,
  XCircle,
  Plus,
} from "@phosphor-icons/react";
import {
  readVault,
  handleClient,
  decryptWithRetry,
  publicClient,
  sendVaultTx,
  sendTo,
  withdrawAll,
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

type View = "landing" | "app" | "audit" | "mypay";
type Section = "overview" | "payroll" | "funding" | "auditors";

const TITLES: Record<Section, string> = {
  overview: "Overview",
  payroll: "Payroll",
  funding: "Funding",
  auditors: "Auditors",
};

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

function parsePath(): string[] {
  return window.location.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
}
function viewFromPath(): View {
  const [root] = parsePath();
  if (root === "app") return "app";
  if (root === "audit") return "audit";
  if (root === "mypay") return "mypay";
  return "landing";
}
const SECTIONS: Section[] = ["overview", "funding", "payroll", "auditors"];
function sectionFromPath(): Section {
  const [root, sub] = parsePath();
  if (root === "app" && SECTIONS.includes(sub as Section)) return sub as Section;
  return "overview";
}

export function App() {
  const { address } = useAccount();
  const [section, setSection] = useState<Section>(sectionFromPath);
  const [view, setView] = useState<View>(viewFromPath);
  const [company, setCompany] = useState<string>("");
  const [editingCompany, setEditingCompany] = useState(false);

  useEffect(() => {
    const onPop = () => {
      setView(viewFromPath());
      setSection(sectionFromPath());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigate(path: string) {
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
    window.scrollTo(0, 0);
  }

  function go(v: View) {
    const map: Record<View, string> = {
      app: "/app/overview", audit: "/audit", mypay: "/mypay", landing: "/",
    };
    navigate(map[v]);
    setView(v);
    if (v === "app") setSection("overview");
  }

  function goSection(s: Section) {
    navigate(`/app/${s}`);
    setSection(s);
    setView("app");
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
    return (
      <Landing
        onStart={() => go("app")}
        onAudit={() => go("audit")}
        onMyPay={() => go("mypay")}
      />
    );
  }

  if (view === "audit") {
    return <AuditPage onBack={() => go("landing")} />;
  }

  if (view === "mypay") {
    return <MyPayPage onBack={() => go("landing")} />;
  }

  const NavItem = ({ id, icon }: { id: Section; icon: React.ReactNode }) => (
    <button className={`side-item ${section === id ? "on" : ""}`} onClick={() => goSection(id)}>
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
          {section === "overview" && <OverviewPanel onGo={goSection} />}
          {section === "payroll" && <PayrollPanel />}
          {section === "funding" && <FundingPanel />}
          {section === "auditors" && <AuditorsPanel />}
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

/* ---------------- Auditor page (standalone) ---------------- */

function AuditPage({ onBack }: { onBack: () => void }) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [company, setCompany] = useState("");
  const [total, setTotal] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function decryptAggregate() {
    setResult(null);
    setTotal("");
    if (!isAddress(company, { strict: false }))
      return setResult({ ok: false, msg: "Invalid company address." });
    if (!walletClient) return;
    setBusy(true);
    try {
      const handle = (await readVault().read.totalPayrollHandle([company as Address])) as `0x${string}`;
      if (handle === ZERO_HANDLE) {
        setResult({ ok: false, msg: "No payroll for this company." });
        return;
      }
      const v = await decryptWithRetry(walletClient, handle);
      setTotal(v.toString());
    } catch {
      setResult({ ok: false, msg: "Access denied. This company has not granted you access." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lp verify">
      <header className="lp-nav">
        <div className="lp-brand">
          <span className="lp-logo-mark"><ShieldCheck weight="fill" size={19} /></span>
          <span>PayVault</span>
        </div>
        <button className="lp-btn lp-btn-ghost" onClick={onBack}>
          <ArrowLeft size={15} weight="bold" /> Home
        </button>
      </header>
      <section className="verify-hero">
        <h1>Verify a company's total payroll.</h1>
      </section>
      <section className="verify-body">
        {!address ? (
          <div className="card center">
            <p>Connect the auditor wallet you were granted access with.</p>
            <ConnectButton />
          </div>
        ) : (
          <div className="card">
            <label>Company wallet</label>
            <div className="row">
              <input placeholder="0x…" value={company} onChange={(e) => setCompany(e.target.value)} />
              <button className="btn" disabled={busy} onClick={decryptAggregate}>
                {busy ? <CircleNotch size={17} weight="bold" className="spin" /> : <LockKeyOpen size={17} weight="bold" />} Decrypt total
              </button>
            </div>
            {total && (
              <div className="public-out">
                <div className="stat">
                  <span className="big">{total}</span>
                  <span>total payroll (aggregate)</span>
                </div>
              </div>
            )}
            {result && <ResultBanner ok={result.ok}>{result.msg}</ResultBanner>}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------- Employee dashboard (standalone) ---------------- */

function MyPayPage({ onBack }: { onBack: () => void }) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  if (!address)
    return (
      <div className="lp verify">
        <header className="lp-nav">
          <div className="lp-brand">
            <span className="lp-logo-mark"><ShieldCheck weight="fill" size={19} /></span>
            <span>PayVault</span>
          </div>
          <button className="lp-btn lp-btn-ghost" onClick={onBack}>
            <ArrowLeft size={15} weight="bold" /> Home
          </button>
        </header>
        <section className="verify-hero">
          <h1>Your confidential pay.</h1>
          <p className="muted">Connect your employee wallet to see the pay only you can read.</p>
        </section>
        <section className="verify-body">
          <div className="card center">
            <ConnectButton />
          </div>
        </section>
      </div>
    );

  return (
    <div className="dash">
      <aside className="sidebar">
        <div className="side-brand">
          <span className="side-logo-mark"><ShieldCheck weight="fill" size={18} /></span>
          <span className="side-logo">PayVault</span>
        </div>

        <div className="side-company-box">
          <div className="side-company-label" style={{ cursor: "default" }}>
            <span className="mono">{short(address)}</span>
            <Wallet size={13} />
          </div>
        </div>

        <nav className="side-nav">
          <div className="side-group">Employee</div>
          <button className="side-item on">
            <Money size={18} weight="bold" /> <span>My pay</span>
          </button>
        </nav>

        <button className="side-home" onClick={() => disconnect()}>
          <ArrowLeft size={17} weight="bold" /> Disconnect
        </button>
        <button className="side-home" onClick={onBack}>
          <House size={17} weight="bold" /> Home
        </button>
      </aside>

      <div className="content">
        <header className="content-top">
          <h1>My pay</h1>
          <div className="content-top-right">
            <a
              className="verify-link"
              href={`${EXPLORER}/address/${address}`}
              target="_blank"
              rel="noreferrer"
              title="View this wallet's authentic on-chain record on Etherscan"
            >
              <ArrowSquareOut size={15} weight="bold" /> Verify on-chain
            </a>
            <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
          </div>
        </header>

        <main className="content-main">
          <EmployeePanel />
        </main>
      </div>
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
  const [reveal, setReveal] = useState<Record<string, string>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Address | "">("");
  const [editSalary, setEditSalary] = useState("");
  const [paying, setPaying] = useState<Record<string, "pending" | "done">>({});

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
      setShowAdd(false);
      refresh();
    } catch (e: any) {
      setResult({ ok: false, msg: e.shortMessage || e.message || String(e) });
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

  async function removeEmployee(e: Address) {
    if (!walletClient) return;
    setResult(null);
    setBusy(true);
    try {
      const tx = await sendVaultTx(walletClient, "removeEmployee", [e]);
      await publicClient().waitForTransactionReceipt({ hash: tx });
      setResult({ ok: true, msg: `Removed ${short(e)} from payroll.` });
      refresh();
    } catch (err: any) {
      setResult({ ok: false, msg: err.shortMessage || err.message || String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function saveSalary(e: Address) {
    setResult(null);
    let amount: bigint;
    try {
      amount = BigInt(editSalary);
      if (amount <= 0n) throw new Error();
    } catch {
      return setResult({ ok: false, msg: "Enter a positive salary." });
    }
    if (!walletClient) return;
    setBusy(true);
    try {
      const hc = await handleClient(walletClient);
      const { handle, handleProof } = await hc.encryptInput(amount, "uint256", PAYROLL_VAULT_ADDRESS);
      const tx = await sendVaultTx(walletClient, "updateSalary", [e, handle, handleProof]);
      await publicClient().waitForTransactionReceipt({ hash: tx });
      setResult({ ok: true, msg: `Salary updated for ${short(e)}.` });
      setReveal((r) => ({ ...r, [e]: "" }));
      setEditing("");
      setEditSalary("");
    } catch (err: any) {
      setResult({ ok: false, msg: err.shortMessage || err.message || String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function runPayroll() {
    if (!walletClient) return;
    setBusy(true);
    setResult(null);
    // Mark every employee as pending; the payout is one atomic tx.
    setPaying(Object.fromEntries(employees.map((e) => [e, "pending"])) as Record<string, "pending">);
    try {
      const tx = await sendVaultTx(walletClient, "runPayroll", []);
      await publicClient().waitForTransactionReceipt({ hash: tx });
      // Reveal the paid state one by one for a clear visual confirmation.
      for (const e of employees) {
        setPaying((p) => ({ ...p, [e]: "done" }));
        await new Promise((r) => setTimeout(r, 260));
      }
      setResult({ ok: true, msg: `Payroll paid to ${employees.length} employee${employees.length > 1 ? "s" : ""}.` });
    } catch (e: any) {
      setPaying({});
      setResult({ ok: false, msg: e.shortMessage || e.message || String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="panel-head">
        <h3>Employees ({employees.length})</h3>
        <div className="row">
          <button className="btn ghost sm" onClick={() => { setShowAdd((v) => !v); setResult(null); }}>
            <Plus size={16} weight="bold" /> Add employee
          </button>
          <button className="btn sm" disabled={busy || employees.length === 0} onClick={runPayroll}>
            {busy ? <CircleNotch size={16} weight="bold" className="spin" /> : <CurrencyDollar size={16} weight="bold" />} Run payroll
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="add-form">
          <label>Employee wallet</label>
          <input placeholder="0x…" value={emp} onChange={(e) => setEmp(e.target.value)} />
          <label>Monthly salary (confidential)</label>
          <div className="amount-field">
            <input type="number" inputMode="decimal" placeholder="0" value={salary} onChange={(e) => setSalary(e.target.value)} />
            <span className="amount-suffix">PayUSD</span>
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" disabled={busy} onClick={addEmployee}>
              {busy ? <><CircleNotch size={17} weight="bold" className="spin" /> Adding…</> : <><LockKey size={17} weight="bold" /> Encrypt & add</>}
            </button>
            <button className="btn ghost" onClick={() => { setShowAdd(false); setResult(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {employees.length === 0 ? (
        <p className="muted empty">No employees yet. Click “Add employee” to register your first one.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Employee</th><th>Salary</th><th></th></tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e}>
                <td className="mono">
                  {paying[e] === "done" ? <CheckCircle size={14} weight="fill" className="paid-tick" /> : paying[e] === "pending" ? <CircleNotch size={14} weight="bold" className="spin" /> : null}
                  {short(e)}
                </td>
                {editing === e ? (
                  <td colSpan={2}>
                    <div className="amount-field inline">
                      <input autoFocus type="number" inputMode="decimal" placeholder="New salary" value={editSalary} onChange={(ev) => setEditSalary(ev.target.value)} />
                      <span className="amount-suffix">PayUSD</span>
                    </div>
                    <div className="row" style={{ marginTop: 8 }}>
                      <button className="btn sm" disabled={busy} onClick={() => saveSalary(e)}>
                        {busy ? <CircleNotch size={14} weight="bold" className="spin" /> : <LockKey size={14} weight="bold" />} Save
                      </button>
                      <button className="btn ghost sm" onClick={() => { setEditing(""); setEditSalary(""); }}>Cancel</button>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="mono">
                      {reveal[e] ? (reveal[e] === "denied" ? "Denied" : reveal[e]) : "Encrypted"}
                    </td>
                    <td className="row-actions">
                      <button className="link" onClick={() => revealSalary(e)}><Eye size={13} weight="bold" /> reveal</button>
                      <button className="link" onClick={() => { setEditing(e); setEditSalary(""); setResult(null); }}><PencilSimple size={13} weight="bold" /> edit</button>
                      <button className="link danger" disabled={busy} onClick={() => removeEmployee(e)}><XCircle size={13} weight="bold" /> remove</button>
                      <a className="link" href={`${EXPLORER}/address/${e}`} target="_blank" rel="noreferrer">
                        <ArrowSquareOut size={13} weight="bold" /> verify
                      </a>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result && <ResultBanner ok={result.ok}>{result.msg}</ResultBanner>}
    </div>
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
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!address)
    return (
      <div className="card center">
        <p>Connect your wallet to grant auditor access.</p>
        <ConnectButton />
      </div>
    );

  async function grantAuditor() {
    setResult(null);
    if (!isAddress(auditor, { strict: false }))
      return setResult({ ok: false, msg: "Invalid auditor address." });
    if (!walletClient) return;
    setBusy(true);
    try {
      const tx = await sendVaultTx(walletClient, "grantAuditor", [auditor as Address]);
      await publicClient().waitForTransactionReceipt({ hash: tx });
      setResult({ ok: true, msg: `Auditor ${short(auditor)} can now verify the total.` });
      setAuditor("");
    } catch (e: any) {
      setResult({ ok: false, msg: e.shortMessage || e.message || String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function revokeAuditor() {
    setResult(null);
    if (!isAddress(auditor, { strict: false }))
      return setResult({ ok: false, msg: "Invalid auditor address." });
    if (!walletClient) return;
    setBusy(true);
    try {
      const tx = await sendVaultTx(walletClient, "revokeAuditor", [auditor as Address]);
      await publicClient().waitForTransactionReceipt({ hash: tx });
      setResult({ ok: true, msg: `Access revoked for ${short(auditor)}.` });
      setAuditor("");
    } catch (e: any) {
      setResult({ ok: false, msg: e.shortMessage || e.message || String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>Grant an auditor</h3>
      <p className="muted">
        The auditor can decrypt the <strong>aggregate</strong> payroll only, never individual salaries.
      </p>
      <label>Auditor wallet</label>
      <input placeholder="0x…" value={auditor} onChange={(e) => setAuditor(e.target.value)} />
      <div className="row">
        <button className="btn" disabled={busy} onClick={grantAuditor}>
          {busy ? <CircleNotch size={17} weight="bold" className="spin" /> : <ShieldCheck size={17} weight="bold" />} Grant aggregate access
        </button>
        <button className="btn ghost" disabled={busy} onClick={revokeAuditor}>
          <XCircle size={17} weight="bold" /> Revoke access
        </button>
      </div>
      {result && <ResultBanner ok={result.ok}>{result.msg}</ResultBanner>}

      <div className="mini-steps">
        <div className="mini-step"><span className="hint-num">1</span> Grant access to the auditor's wallet above.</div>
        <div className="mini-step"><span className="hint-num">2</span> Share the auditor page&nbsp;<a href="/audit" target="_blank" rel="noreferrer">/audit&nbsp;<ArrowSquareOut size={12} weight="bold" /></a></div>
        <div className="mini-step"><span className="hint-num">3</span> They connect and decrypt the total — never a salary.</div>
      </div>
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
  const [withdrawing, setWithdrawing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [employers, setEmployers] = useState<Address[]>([]);
  const [history, setHistory] = useState<{ company: Address; block: bigint; tx: string }[]>([]);

  useEffect(() => {
    (async () => {
      if (!address) return;
      let list: Address[] = [];
      try {
        list = [...((await readVault().read.employersOf([address])) as Address[])];
        setEmployers(list);
      } catch {
        return;
      }
      // Payment history: PayrollRun events emitted by the employers of this wallet.
      try {
        const pc = publicClient();
        const latest = await pc.getBlockNumber();
        const fromBlock = latest > 50000n ? latest - 50000n : 0n;
        const ev = parseAbiItem("event PayrollRun(address indexed company, uint256 employeeCount)");
        const rows: { company: Address; block: bigint; tx: string }[] = [];
        for (const company of list) {
          const logs = await pc.getLogs({ address: PAYROLL_VAULT_ADDRESS, event: ev, args: { company }, fromBlock });
          for (const l of logs) rows.push({ company, block: l.blockNumber!, tx: l.transactionHash! });
        }
        rows.sort((a, b) => Number(b.block - a.block));
        setHistory(rows);
      } catch {
        /* history is best-effort */
      }
    })();
  }, [address]);

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
      setStatus("Only you can read this. It is encrypted for everyone else.");
    } catch {
      setStatus("Nothing to decrypt yet, or access not granted.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!walletClient) return;
    setWithdrawing(true);
    setResult(null);
    try {
      const amount = await withdrawAll(walletClient, setStatus);
      setResult({ ok: true, msg: `Withdrew ${amount.toString()} to real PayUSD in your wallet.` });
      setStatus("");
      setPay("");
    } catch (e: any) {
      setResult({ ok: false, msg: e.shortMessage || e.message || String(e) });
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <div className="card">
      <h3>My confidential pay</h3>
      <p className="muted">
        Connected as <span className="mono">{short(address)}</span>. Your received pay is held as a
        confidential <strong>cPAY</strong> balance (ERC-7984), encrypted on-chain. Only you can decrypt it.
      </p>
      <div className="row">
        <button className="btn" disabled={busy || withdrawing} onClick={decryptPay}>
          {busy ? <CircleNotch size={17} weight="bold" className="spin" /> : <LockKeyOpen size={17} weight="bold" />} Decrypt my pay
        </button>
        <button className="btn ghost" disabled={busy || withdrawing} onClick={withdraw}>
          {withdrawing ? <CircleNotch size={17} weight="bold" className="spin" /> : <Money size={17} weight="bold" />} Withdraw to PayUSD
        </button>
      </div>
      {pay && (
        <div className="public-out">
          <div className="stat">
            <span className="big">{pay}</span>
            <span>your confidential pay (cPAY)</span>
          </div>
        </div>
      )}
      {status && <div className="status">{status}</div>}
      {result && <ResultBanner ok={result.ok}>{result.msg}</ResultBanner>}

      {employers.length > 0 && (
        <div className="employers">
          <div className="employers-label">Paid by</div>
          {employers.map((e) => (
            <a key={e} className="employer-chip" href={`${EXPLORER}/address/${e}`} target="_blank" rel="noreferrer">
              <Buildings size={14} weight="bold" /> <span className="mono">{short(e)}</span>
              <ArrowSquareOut size={11} weight="bold" />
            </a>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="pay-history">
          <div className="employers-label">Payment history</div>
          <table>
            <thead>
              <tr><th>Company</th><th>Block</th><th></th></tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.tx}>
                  <td className="mono">{short(h.company)}</td>
                  <td className="mono">#{h.block.toString()}</td>
                  <td className="row-actions">
                    <a className="link" href={`${EXPLORER}/tx/${h.tx}`} target="_blank" rel="noreferrer">
                      view <ArrowSquareOut size={12} weight="bold" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: ".78rem", marginTop: 6 }}>Dates are public. Amounts stay encrypted.</p>
        </div>
      )}
    </div>
  );
}
