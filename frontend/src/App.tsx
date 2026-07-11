import { useEffect, useState } from "react";
import { isAddress, formatUnits, type Address } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
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
import { Auth } from "./Auth";

type Tab = "company" | "public" | "auditor" | "employee";

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export function App() {
  const { address } = useAccount();
  const [tab, setTab] = useState<Tab>("company");
  const [view, setView] = useState<"landing" | "auth" | "app">("landing");
  const [company, setCompany] = useState<string>("");

  useEffect(() => {
    if (address) {
      const saved = localStorage.getItem(`payvault:company:${address.toLowerCase()}`);
      setCompany(saved || "");
    }
  }, [address]);

  if (view === "landing") {
    return <Landing onStart={() => setView("auth")} />;
  }

  if (view === "auth") {
    return (
      <Auth
        onEnter={(name) => {
          setCompany(name);
          setView("app");
        }}
        onBack={() => setView("landing")}
      />
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">PayVault</span>
          <span className="pill">{company || "Confidential Payroll · Nox"}</span>
        </div>
        <div className="topbar-right">
          <ConnectButton
            accountStatus="address"
            chainStatus="icon"
            showBalance={{ smallScreen: false, largeScreen: true }}
          />
          <button className="signout" onClick={() => setView("landing")}>
            Sign out
          </button>
        </div>
      </header>

      <section className="hero">
        <h1>Pay your team on-chain. Salaries stay secret.</h1>
        <p>
          Salaries are encrypted end-to-end with{" "}
          <a href="https://docs.noxprotocol.io" target="_blank" rel="noreferrer">
            Nox
          </a>
          . The public chain only sees <em>that</em> payments happen, never{" "}
          <em>how much</em>. An auditor can verify the aggregate without seeing
          individual salaries.{" "}
          <a href={`${EXPLORER}/address/${PAYROLL_VAULT_ADDRESS}`} target="_blank" rel="noreferrer">
            Contract ↗
          </a>
        </p>
      </section>

      <nav className="tabs">
        <button className={tab === "company" ? "on" : ""} onClick={() => setTab("company")}>
          🏢 Company
        </button>
        <button className={tab === "public" ? "on" : ""} onClick={() => setTab("public")}>
          🌐 Public view
        </button>
        <button className={tab === "auditor" ? "on" : ""} onClick={() => setTab("auditor")}>
          🔎 Auditor
        </button>
        <button className={tab === "employee" ? "on" : ""} onClick={() => setTab("employee")}>
          💼 My pay
        </button>
      </nav>

      <main>
        {tab === "company" && <CompanyPanel />}
        {tab === "public" && <PublicPanel defaultCompany={address} />}
        {tab === "auditor" && <AuditorPanel />}
        {tab === "employee" && <EmployeePanel />}
      </main>

      <footer>
        <span>Deployed on ETH Sepolia · iExec WTF Hackathon</span>
      </footer>
    </div>
  );
}

/* ---------------- Company ---------------- */

function CompanyPanel() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [emp, setEmp] = useState("");
  const [salary, setSalary] = useState("");
  const [auditor, setAuditor] = useState("");
  const [status, setStatus] = useState("");
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
      setStatus("🔐 Encrypting salary in the Nox TEE…");
      const hc = await handleClient(walletClient);
      const { handle, handleProof } = await hc.encryptInput(amount, "uint256", PAYROLL_VAULT_ADDRESS);
      setStatus("⛓️ Sending addEmployee() transaction…");
      const tx = await sendVaultTx(walletClient, "addEmployee", [emp as Address, handle, handleProof]);
      setStatus("⏳ Waiting for confirmation…");
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
    setStatus("🔓 Decrypting your total payroll…");
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
    setStatus("💸 Paying all employees confidentially…");
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

  async function grantAuditor() {
    setStatus("");
    if (!isAddress(auditor, { strict: false }))
      return setStatus("❌ Invalid auditor address (need 0x + 40 hex chars)");
    if (!walletClient) return;
    setBusy(true);
    try {
      setStatus("⛓️ Granting auditor access to the aggregate…");
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
    <div className="grid">
      <div className="card">
        <h3>Add an employee</h3>
        <label>Employee wallet</label>
        <input placeholder="0x…" value={emp} onChange={(e) => setEmp(e.target.value)} />
        <label>Monthly salary (confidential)</label>
        <input placeholder="e.g. 5000" value={salary} onChange={(e) => setSalary(e.target.value)} />
        <button className="btn" disabled={busy} onClick={addEmployee}>
          🔐 Encrypt & add
        </button>
      </div>

      <div className="card">
        <h3>Grant an auditor</h3>
        <p className="muted">
          The auditor will be able to decrypt the <strong>aggregate</strong> payroll
          only, never individual salaries.
        </p>
        <label>Auditor wallet</label>
        <input placeholder="0x…" value={auditor} onChange={(e) => setAuditor(e.target.value)} />
        <button className="btn ghost" disabled={busy} onClick={grantAuditor}>
          Grant aggregate access
        </button>
      </div>

      <div className="card wide">
        <div className="row between">
          <h3>Your payroll ({employees.length})</h3>
          <div className="row">
            <button className="btn ghost" disabled={busy} onClick={decryptTotal}>
              🔓 Decrypt total{total !== "" ? `: ${total}` : ""}
            </button>
            <button className="btn" disabled={busy || employees.length === 0} onClick={runPayroll}>
              💸 Run payroll
            </button>
          </div>
        </div>
        {employees.length === 0 ? (
          <p className="muted">No employees yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Salary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e}>
                  <td className="mono">{short(e)}</td>
                  <td className="mono">
                    {reveal[e] ? (reveal[e] === "denied" ? "🔒 denied" : reveal[e]) : "🔒 encrypted"}
                  </td>
                  <td>
                    <button className="link" onClick={() => revealSalary(e)}>
                      reveal
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {status && <div className="status wide">{status}</div>}
    </div>
  );
}

/* ---------------- Public ---------------- */

function PublicPanel({ defaultCompany }: { defaultCompany?: Address }) {
  const [company, setCompany] = useState<string>(defaultCompany || "");
  const [count, setCount] = useState<number | null>(null);
  const [init, setInit] = useState<boolean | null>(null);
  const [streamId, setStreamId] = useState<bigint>(0n);
  const [budget, setBudget] = useState<bigint>(0n);
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
      const sid = (await c.read.sablierStreamId([company as Address])) as bigint;
      const b = (await c.read.publicBudget([company as Address])) as bigint;
      setCount(Number(n));
      setInit(i);
      setStreamId(sid);
      setBudget(b);
    } catch (e: any) {
      setStatus("❌ " + (e.message || String(e)));
    }
  }

  return (
    <div className="card">
      <h3>What the public sees</h3>
      <p className="muted">
        Anyone can read the chain. Here is <em>everything</em> a public observer
        learns about a company's payroll. Notice there are <strong>no amounts</strong>.
      </p>
      <label>Company wallet</label>
      <div className="row">
        <input placeholder="0x…" value={company} onChange={(e) => setCompany(e.target.value)} />
        <button className="btn" onClick={look}>
          Inspect
        </button>
      </div>
      {count !== null && (
        <div className="public-out">
          <div className="stat">
            <span className="big">{count}</span>
            <span>employees on payroll</span>
          </div>
          <div className="stat">
            <span className="big">{init ? "Active ✅" : "None"}</span>
            <span>payroll status</span>
          </div>
          <div className="stat">
            <span className="big">🔒🔒🔒</span>
            <span>salary amounts (hidden)</span>
          </div>
        </div>
      )}
      {count !== null && streamId > 0n && (
        <div className="public-out">
          <div className="stat">
            <span className="big">#{streamId.toString()}</span>
            <span>public Sablier funding stream</span>
          </div>
          <div className="stat">
            <span className="big">{formatUnits(budget, 18)}</span>
            <span>PayUSD budget (aggregate, public)</span>
          </div>
          <div className="stat">
            <span className="big">= 🔒</span>
            <span>split across employees (hidden)</span>
          </div>
        </div>
      )}
      {count !== null && (
        <p className="muted" style={{ marginTop: 12 }}>
          The public sees a single Sablier lump sum funding the vault, never who
          gets what. That confidential split is enforced by Nox.
        </p>
      )}

      <div className="beforeafter">
        <h4>See it on the public block explorer</h4>
        <div className="ba-grid">
          <a className="ba-card before" href={`${EXPLORER}/tx/${DEMO_PUBLIC_TX}`} target="_blank" rel="noreferrer">
            <span className="ba-tag">🔴 Normal payment</span>
            <span className="ba-amt">5,000 visible</span>
            <span className="ba-note">A plain transfer. Anyone reads the amount.</span>
          </a>
          <a className="ba-card after" href={`${EXPLORER}/tx/${DEMO_CONFIDENTIAL_TX}`} target="_blank" rel="noreferrer">
            <span className="ba-tag">🟢 With PayVault</span>
            <span className="ba-amt">🔒 encrypted</span>
            <span className="ba-note">Same operation. The salary is an unreadable handle.</span>
          </a>
        </div>
      </div>

      {status && <div className="status">{status}</div>}
    </div>
  );
}

/* ---------------- Auditor ---------------- */

function AuditorPanel() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [company, setCompany] = useState("");
  const [total, setTotal] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  if (!address)
    return (
      <div className="card center">
        <p>Connect the auditor wallet the company granted access to.</p>
        <ConnectButton />
      </div>
    );

  async function decryptAggregate() {
    setStatus("");
    if (!isAddress(company, { strict: false }))
      return setStatus("❌ Invalid company address (need 0x + 40 hex chars)");
    if (!walletClient) return;
    setBusy(true);
    setStatus("🔓 Decrypting the aggregate payroll…");
    try {
      const handle = (await readVault().read.totalPayrollHandle([company as Address])) as `0x${string}`;
      if (handle === ZERO_HANDLE) {
        setStatus("No payroll for this company.");
        return;
      }
      const v = await decryptWithRetry(walletClient, handle);
      setTotal(v.toString());
      setStatus("✅ Verified. You saw the total, never an individual salary.");
    } catch {
      setStatus("🔒 Access denied. This company has not granted you access.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>Auditor verification</h3>
      <p className="muted">
        Connected as <span className="mono">{short(address)}</span>. Enter a company
        you were granted access to and decrypt its total payroll. You can prove
        compliance <strong>without</strong> seeing any individual salary.
      </p>
      <label>Company wallet</label>
      <div className="row">
        <input placeholder="0x…" value={company} onChange={(e) => setCompany(e.target.value)} />
        <button className="btn" disabled={busy} onClick={decryptAggregate}>
          🔓 Decrypt total
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
    setStatus("🔓 Decrypting your confidential pay…");
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
      setStatus("🔒 Nothing to decrypt yet, or access not granted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>My confidential pay</h3>
      <p className="muted">
        Connected as <span className="mono">{short(address)}</span>. Your received
        pay is held as a confidential <strong>cPAY</strong> balance (ERC-7984),
        encrypted on-chain. Only you can decrypt it.
      </p>
      <button className="btn" disabled={busy} onClick={decryptPay}>
        🔓 Decrypt my pay
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
