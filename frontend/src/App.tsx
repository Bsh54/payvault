import { useEffect, useState } from "react";
import { isAddress, formatUnits, type Address } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Buildings,
  Globe,
  MagnifyingGlass,
  Wallet,
  LockKey,
  LockKeyOpen,
  CurrencyDollar,
  UsersThree,
  Money,
  ShieldCheck,
  House,
} from "@phosphor-icons/react";
import {
  readVault,
  handleClient,
  decryptWithRetry,
  publicClient,
  sendVaultTx,
  ZERO_HANDLE,
} from "./lib/wallet";
import {
  PAYROLL_VAULT_ADDRESS,
  EXPLORER,
  DEMO_PUBLIC_TX,
  DEMO_CONFIDENTIAL_TX,
} from "./lib/payvault";
import { Landing } from "./Landing";

type Section = "payroll" | "funding" | "auditors" | "public" | "mypay";

const TITLES: Record<Section, string> = {
  payroll: "Payroll",
  funding: "Funding",
  auditors: "Auditors",
  public: "Public view",
  mypay: "My pay",
};

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export function App() {
  const { address } = useAccount();
  const [section, setSection] = useState<Section>("payroll");
  const [view, setView] = useState<"landing" | "app">(
    () => (window.location.hash.includes("app") ? "app" : "landing"),
  );
  const [company, setCompany] = useState<string>("");

  useEffect(() => {
    const onHash = () =>
      setView(window.location.hash.includes("app") ? "app" : "landing");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function go(v: "landing" | "app") {
    const hash = v === "app" ? "#/app" : "#/";
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
    return <Landing onStart={() => go("app")} />;
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
        <input
          className="side-company"
          placeholder="Name your company"
          value={company}
          onChange={(e) => saveCompany(e.target.value)}
        />

        <nav className="side-nav">
          <div className="side-group">Company</div>
          <NavItem id="payroll" icon={<Buildings size={18} weight="bold" />} />
          <NavItem id="funding" icon={<Money size={18} weight="bold" />} />
          <NavItem id="auditors" icon={<MagnifyingGlass size={18} weight="bold" />} />

          <div className="side-group">Explore</div>
          <NavItem id="public" icon={<Globe size={18} weight="bold" />} />

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
          <ConnectButton
            accountStatus="address"
            chainStatus="icon"
            showBalance={{ smallScreen: false, largeScreen: true }}
          />
        </header>

        <main className="content-main">
          {section === "payroll" && <PayrollPanel />}
          {section === "funding" && <FundingPanel />}
          {section === "auditors" && <AuditorsPanel />}
          {section === "public" && <PublicPanel defaultCompany={address} />}
          {section === "mypay" && <EmployeePanel />}
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
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [employees, setEmployees] = useState<Address[]>([]);
  const [budget, setBudget] = useState<bigint>(0n);
  const [total, setTotal] = useState<string>("");
  const [reveal, setReveal] = useState<Record<string, string>>({});

  async function refresh() {
    if (!address) return;
    try {
      const c = readVault();
      const list = (await c.read.employees([address])) as Address[];
      const b = (await c.read.publicBudget([address])) as bigint;
      setEmployees([...list]);
      setBudget(b);
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
    setStatus("");
    if (!isAddress(emp, { strict: false }))
      return setStatus("❌ Invalid employee address (need 0x + 40 hex chars)");
    let amount: bigint;
    try {
      amount = BigInt(salary);
      if (amount <= 0n) throw new Error();
    } catch {
      return setStatus("❌ Salary must be a positive whole number");
    }
    if (!walletClient) return setStatus("❌ Wallet not ready");
    setBusy(true);
    try {
      setStatus("Encrypting salary in the Nox TEE…");
      const hc = await handleClient(walletClient);
      const { handle, handleProof } = await hc.encryptInput(amount, "uint256", PAYROLL_VAULT_ADDRESS);
      setStatus("Sending addEmployee() transaction…");
      const tx = await sendVaultTx(walletClient, "addEmployee", [emp as Address, handle, handleProof]);
      setStatus("Waiting for confirmation…");
      await publicClient().waitForTransactionReceipt({ hash: tx });
      setStatus("✅ Employee added. Salary stays encrypted on-chain.");
      setEmp("");
      setSalary("");
      refresh();
    } catch (e: any) {
      setStatus("❌ " + (e.shortMessage || e.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function decryptTotal() {
    if (!walletClient) return;
    setBusy(true);
    setStatus("Decrypting your total payroll…");
    try {
      const handle = (await readVault().read.totalPayrollHandle([address!])) as `0x${string}`;
      if (handle === ZERO_HANDLE) {
        setTotal("0");
        setStatus("No payroll yet.");
        return;
      }
      const v = await decryptWithRetry(walletClient, handle);
      setTotal(v.toString());
      setStatus("✅ Total decrypted (only you can see this).");
    } catch (e: any) {
      setStatus("❌ " + (e.message || String(e)));
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
    setStatus("Paying all employees confidentially…");
    try {
      const tx = await sendVaultTx(walletClient, "runPayroll", []);
      await publicClient().waitForTransactionReceipt({ hash: tx });
      setStatus("✅ Payroll run. Each employee received an encrypted cPAY balance. Amounts stay secret.");
    } catch (e: any) {
      setStatus("❌ " + (e.shortMessage || e.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* KPI overview */}
      <div className="kpis">
        <div className="kpi">
          <span className="kpi-icon"><UsersThree size={20} weight="bold" /></span>
          <div>
            <span className="kpi-value">{employees.length}</span>
            <span className="kpi-label">Employees</span>
          </div>
        </div>
        <div className="kpi">
          <span className="kpi-icon"><LockKey size={20} weight="bold" /></span>
          <div>
            <span className="kpi-value">{total !== "" ? total : "•••"}</span>
            <span className="kpi-label">Total payroll (encrypted)</span>
          </div>
        </div>
        <div className="kpi">
          <span className="kpi-icon"><Money size={20} weight="bold" /></span>
          <div>
            <span className="kpi-value">{budget > 0n ? formatUnits(budget, 18) : "—"}</span>
            <span className="kpi-label">Funding budget (PayUSD)</span>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Add an employee</h3>
          <label>Employee wallet</label>
          <input placeholder="0x…" value={emp} onChange={(e) => setEmp(e.target.value)} />
          <label>Monthly salary (confidential)</label>
          <input placeholder="e.g. 5000" value={salary} onChange={(e) => setSalary(e.target.value)} />
          <button className="btn" disabled={busy} onClick={addEmployee}>
            <LockKey size={17} weight="bold" /> Encrypt & add
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

        {status && <div className="status wide">{status}</div>}
      </div>
    </>
  );
}

/* ---------------- Funding ---------------- */

function FundingPanel() {
  const { address } = useAccount();
  const [streamId, setStreamId] = useState<bigint>(0n);
  const [budget, setBudget] = useState<bigint>(0n);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      if (!address) return;
      try {
        const c = readVault();
        setStreamId((await c.read.sablierStreamId([address])) as bigint);
        setBudget((await c.read.publicBudget([address])) as bigint);
      } catch {
        /* ignore */
      } finally {
        setLoaded(true);
      }
    })();
  }, [address]);

  if (!address)
    return (
      <div className="card center">
        <p>Connect your wallet to see your funding.</p>
        <ConnectButton />
      </div>
    );

  return (
    <div className="card">
      <h3>Public funding (Sablier)</h3>
      <p className="muted">
        Your payroll is funded by a single <strong>public</strong> Sablier stream. The chain shows
        only this aggregate amount, never the per-employee split, which stays encrypted in Nox.
      </p>
      {!loaded ? (
        <p className="muted">Loading…</p>
      ) : streamId > 0n ? (
        <div className="public-out">
          <div className="stat">
            <span className="big">#{streamId.toString()}</span>
            <span>Sablier stream</span>
          </div>
          <div className="stat">
            <span className="big">{formatUnits(budget, 18)}</span>
            <span>PayUSD budget (public)</span>
          </div>
          <div className="stat">
            <span className="big">Hidden</span>
            <span>per-employee split</span>
          </div>
        </div>
      ) : (
        <p className="muted">No funding stream linked yet for this wallet.</p>
      )}
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
