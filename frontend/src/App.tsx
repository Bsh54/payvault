import { useEffect, useState } from "react";
import { isAddress, type Address } from "viem";
import {
  connectWallet,
  hasWallet,
  vaultContract,
  handleClient,
  decryptWithRetry,
  publicClient,
  ZERO_HANDLE,
} from "./lib/wallet";
import { PAYROLL_VAULT_ADDRESS, EXPLORER } from "./lib/payvault";

type Tab = "company" | "public" | "auditor";

function short(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export function App() {
  const [account, setAccount] = useState<Address | undefined>();
  const [tab, setTab] = useState<Tab>("company");
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (hasWallet() && window.ethereum.selectedAddress) {
      setAccount(window.ethereum.selectedAddress as Address);
    }
    window.ethereum?.on?.("accountsChanged", (a: string[]) =>
      setAccount((a[0] as Address) || undefined),
    );
  }, []);

  async function onConnect() {
    setErr("");
    try {
      setAccount(await connectWallet());
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">PayVault</span>
          <span className="pill">Confidential Payroll · Nox</span>
        </div>
        {account ? (
          <span className="account">{short(account)}</span>
        ) : (
          <button className="btn" onClick={onConnect}>
            {hasWallet() ? "Connect wallet" : "Install MetaMask"}
          </button>
        )}
      </header>

      <section className="hero">
        <h1>Pay your team on-chain — salaries stay secret.</h1>
        <p>
          Salaries are encrypted end-to-end with{" "}
          <a href="https://docs.noxprotocol.io" target="_blank">
            Nox
          </a>
          . The public chain only sees <em>that</em> payments happen, never{" "}
          <em>how much</em>. An auditor can verify the aggregate without seeing
          individual salaries.{" "}
          <a href={`${EXPLORER}/address/${PAYROLL_VAULT_ADDRESS}`} target="_blank">
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
      </nav>

      {err && <div className="error">{err}</div>}

      <main>
        {tab === "company" && <CompanyPanel account={account} onConnect={onConnect} />}
        {tab === "public" && <PublicPanel defaultCompany={account} />}
        {tab === "auditor" && <AuditorPanel account={account} onConnect={onConnect} />}
      </main>

      <footer>
        <span>Deployed on ETH Sepolia · iExec WTF Hackathon</span>
      </footer>
    </div>
  );
}

/* ---------------- Company ---------------- */

function CompanyPanel({
  account,
  onConnect,
}: {
  account?: Address;
  onConnect: () => void;
}) {
  const [emp, setEmp] = useState("");
  const [salary, setSalary] = useState("");
  const [auditor, setAuditor] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [employees, setEmployees] = useState<Address[]>([]);
  const [total, setTotal] = useState<string>("");
  const [reveal, setReveal] = useState<Record<string, string>>({});

  async function refresh() {
    if (!account) return;
    try {
      const c = vaultContract(account);
      const list = (await c.read.employees([account])) as Address[];
      setEmployees([...list]);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    refresh();
  }, [account]);

  if (!account)
    return (
      <div className="card center">
        <p>Connect your wallet to manage your company payroll.</p>
        <button className="btn" onClick={onConnect}>
          Connect wallet
        </button>
      </div>
    );

  async function addEmployee() {
    setStatus("");
    if (!isAddress(emp)) return setStatus("❌ Invalid employee address");
    let amount: bigint;
    try {
      amount = BigInt(salary);
      if (amount <= 0n) throw new Error();
    } catch {
      return setStatus("❌ Salary must be a positive whole number");
    }
    setBusy(true);
    try {
      setStatus("🔐 Encrypting salary in the Nox TEE…");
      const hc = await handleClient(account);
      const { handle, handleProof } = await hc.encryptInput(
        amount,
        "uint256",
        PAYROLL_VAULT_ADDRESS,
      );
      setStatus("⛓️ Sending addEmployee() transaction…");
      const c = vaultContract(account);
      const tx = await c.write.addEmployee([emp as Address, handle, handleProof]);
      setStatus("⏳ Waiting for confirmation…");
      await publicClient().waitForTransactionReceipt({ hash: tx });
      setStatus(`✅ Employee added. Salary stays encrypted on-chain.`);
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
    setBusy(true);
    setStatus("🔓 Decrypting your total payroll…");
    try {
      const c = vaultContract(account!);
      const handle = (await c.read.totalPayrollHandle([account!])) as `0x${string}`;
      if (handle === ZERO_HANDLE) {
        setTotal("0");
        setStatus("No payroll yet.");
        return;
      }
      const v = await decryptWithRetry(account!, handle);
      setTotal(v.toString());
      setStatus("✅ Total decrypted (only you can see this).");
    } catch (e: any) {
      setStatus("❌ " + (e.message || String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function revealSalary(e: Address) {
    setReveal((r) => ({ ...r, [e]: "…" }));
    try {
      const c = vaultContract(account!);
      const handle = (await c.read.salaryHandleOf([account!, e])) as `0x${string}`;
      const v = await decryptWithRetry(account!, handle);
      setReveal((r) => ({ ...r, [e]: v.toString() }));
    } catch (err: any) {
      setReveal((r) => ({ ...r, [e]: "denied" }));
    }
  }

  async function grantAuditor() {
    setStatus("");
    if (!isAddress(auditor)) return setStatus("❌ Invalid auditor address");
    setBusy(true);
    try {
      setStatus("⛓️ Granting auditor access to the aggregate…");
      const c = vaultContract(account!);
      const tx = await c.write.grantAuditor([auditor as Address]);
      await publicClient().waitForTransactionReceipt({ hash: tx });
      setStatus(`✅ Auditor ${short(auditor)} can now verify the total — not individual salaries.`);
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
        <input
          placeholder="e.g. 5000"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
        />
        <button className="btn" disabled={busy} onClick={addEmployee}>
          🔐 Encrypt & add
        </button>
      </div>

      <div className="card">
        <h3>Grant an auditor</h3>
        <p className="muted">
          The auditor will be able to decrypt the <strong>aggregate</strong>{" "}
          payroll only — never individual salaries.
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
          <button className="btn ghost" disabled={busy} onClick={decryptTotal}>
            🔓 Decrypt total{total !== "" ? `: ${total}` : ""}
          </button>
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
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (defaultCompany) setCompany(defaultCompany);
  }, [defaultCompany]);

  async function look() {
    setStatus("");
    if (!isAddress(company)) return setStatus("❌ Invalid company address");
    try {
      const c = vaultContract(company as Address);
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
        Anyone can read the chain. Here is <em>everything</em> a public observer
        learns about a company's payroll — notice there are <strong>no amounts</strong>.
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
      {status && <div className="status">{status}</div>}
    </div>
  );
}

/* ---------------- Auditor ---------------- */

function AuditorPanel({
  account,
  onConnect,
}: {
  account?: Address;
  onConnect: () => void;
}) {
  const [company, setCompany] = useState("");
  const [total, setTotal] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  if (!account)
    return (
      <div className="card center">
        <p>Connect the auditor wallet the company granted access to.</p>
        <button className="btn" onClick={onConnect}>
          Connect wallet
        </button>
      </div>
    );

  async function decryptAggregate() {
    setStatus("");
    if (!isAddress(company)) return setStatus("❌ Invalid company address");
    setBusy(true);
    setStatus("🔓 Decrypting the aggregate payroll…");
    try {
      const c = vaultContract(account!);
      const handle = (await c.read.totalPayrollHandle([company as Address])) as `0x${string}`;
      if (handle === ZERO_HANDLE) {
        setStatus("No payroll for this company.");
        return;
      }
      const v = await decryptWithRetry(account!, handle);
      setTotal(v.toString());
      setStatus("✅ Verified. You saw the total — never an individual salary.");
    } catch (e: any) {
      setStatus("🔒 Access denied — this company has not granted you access.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>Auditor — verify the aggregate</h3>
      <p className="muted">
        Connected as <span className="mono">{short(account)}</span>. Enter a
        company you were granted access to and decrypt its total payroll. You can
        prove compliance <strong>without</strong> seeing any individual salary.
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
