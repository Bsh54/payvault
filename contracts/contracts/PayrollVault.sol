// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";

/// @title PayrollVault (multi-tenant)
/// @notice Confidential payroll registry built on Nox. Any wallet is automatically
///         the owner of its OWN payroll book, keyed by `msg.sender` (the company).
///         Individual salaries are stored as encrypted handles (euint256), decryptable
///         only by the company and the employee. An encrypted running total lets an
///         authorized auditor verify the aggregate payroll WITHOUT seeing individual
///         salaries (selective disclosure).
/// @dev    Underlying public protocols (Safe treasury / Sablier funding) are never
///         modified: this contract layers confidentiality on top of them.
contract PayrollVault is ERC7984 {
    // PayrollVault is itself an ERC-7984 confidential token ("cPAY"): running
    // payroll mints a confidential balance (= the employee's salary) to each
    // employee. Balances are encrypted; only the holder can decrypt their pay.
    constructor() ERC7984("PayVault Confidential Pay", "cPAY", "") {}

    // company => has its total been initialized as an encrypted zero?
    mapping(address => bool) private _initialized;
    // company => encrypted sum of all its salaries
    mapping(address => euint256) private _totalPayroll;
    // company => list of employees
    mapping(address => address[]) private _employees;
    // company => employee => is on payroll
    mapping(address => mapping(address => bool)) public isEmployee;
    // company => employee => encrypted salary handle
    mapping(address => mapping(address => euint256)) private _salary;
    // company => auditor => granted aggregate view
    mapping(address => mapping(address => bool)) public isAuditor;

    // --- Public funding layer (Sablier) ---
    // The company funds the vault with ONE public Sablier stream (a lump sum).
    // The public sees the aggregate budget; the per-employee split stays encrypted.
    mapping(address => uint256) public sablierStreamId;
    mapping(address => uint256) public publicBudget;

    // Public events carry NO amounts — only addresses.
    event EmployeeAdded(address indexed company, address indexed employee);
    event SalaryUpdated(address indexed company, address indexed employee);
    event AuditorGranted(address indexed company, address indexed auditor);
    event AuditorRevoked(address indexed company, address indexed auditor);
    event FundingLinked(address indexed company, uint256 streamId, uint256 publicAmount);
    event PayrollRun(address indexed company, uint256 employeeCount);

    function _ensureInit(address company) private {
        if (!_initialized[company]) {
            euint256 zero = Nox.toEuint256(0);
            _totalPayroll[company] = zero;
            _initialized[company] = true;
            Nox.allowThis(zero);
            Nox.allow(zero, company);
        }
    }

    /// @notice Add an employee to the caller's payroll with an encrypted salary.
    function addEmployee(
        address employee,
        externalEuint256 inputHandle,
        bytes calldata inputProof
    ) external {
        require(employee != address(0), "PayrollVault: zero address");
        address company = msg.sender;
        require(!isEmployee[company][employee], "PayrollVault: already employee");
        _ensureInit(company);

        euint256 salary = Nox.fromExternal(inputHandle, inputProof);

        _salary[company][employee] = salary;
        isEmployee[company][employee] = true;
        _employees[company].push(employee);

        euint256 total = Nox.add(_totalPayroll[company], salary);
        _totalPayroll[company] = total;

        Nox.allowThis(salary);
        Nox.allow(salary, company);
        Nox.allow(salary, employee);

        Nox.allowThis(total);
        Nox.allow(total, company);

        emit EmployeeAdded(company, employee);
    }

    /// @notice Update an existing employee's encrypted salary.
    /// @dev    total = total + newSalary - oldSalary, all on encrypted values.
    function updateSalary(
        address employee,
        externalEuint256 inputHandle,
        bytes calldata inputProof
    ) external {
        address company = msg.sender;
        require(isEmployee[company][employee], "PayrollVault: not employee");

        euint256 newSalary = Nox.fromExternal(inputHandle, inputProof);
        euint256 oldSalary = _salary[company][employee];

        euint256 total = Nox.sub(Nox.add(_totalPayroll[company], newSalary), oldSalary);
        _totalPayroll[company] = total;
        _salary[company][employee] = newSalary;

        Nox.allowThis(newSalary);
        Nox.allow(newSalary, company);
        Nox.allow(newSalary, employee);

        Nox.allowThis(total);
        Nox.allow(total, company);

        emit SalaryUpdated(company, employee);
    }

    /// @notice Grant an auditor read access to the caller's AGGREGATE payroll only.
    ///         Selective disclosure: the auditor can decrypt the total, but has no
    ///         access to any individual salary handle.
    function grantAuditor(address auditor) external {
        require(auditor != address(0), "PayrollVault: zero address");
        address company = msg.sender;
        require(_initialized[company], "PayrollVault: no payroll yet");
        isAuditor[company][auditor] = true;
        Nox.allow(_totalPayroll[company], auditor);
        emit AuditorGranted(company, auditor);
    }

    function revokeAuditor(address auditor) external {
        isAuditor[msg.sender][auditor] = false;
        emit AuditorRevoked(msg.sender, auditor);
    }

    /// @notice Run payroll: pay every employee their (encrypted) salary as a
    ///         confidential cPAY balance. Amounts stay hidden on-chain; only each
    ///         employee (and the ACL) can decrypt their own received pay.
    /// @dev    Same-contract mint reuses the stored salary handle (already
    ///         `allowThis`-ed), so no cross-contract handle sharing is needed.
    function runPayroll() external {
        address company = msg.sender;
        require(_initialized[company], "PayrollVault: no payroll yet");
        address[] storage list = _employees[company];
        for (uint256 i = 0; i < list.length; i++) {
            address emp = list[i];
            _mint(emp, _salary[company][emp]);
        }
        emit PayrollRun(company, list.length);
    }

    /// @notice Record the public Sablier stream that funds this company's payroll.
    /// @dev    The stream itself is created directly on Sablier (recipient = this vault);
    ///         here we just bookkeep the public lump-sum amount and stream id.
    function linkFunding(uint256 streamId, uint256 publicAmount) external {
        sablierStreamId[msg.sender] = streamId;
        publicBudget[msg.sender] = publicAmount;
        emit FundingLinked(msg.sender, streamId, publicAmount);
    }

    // --- Encrypted handle getters (values only decryptable by ACL'd addresses) ---

    function salaryHandleOf(address company, address employee) external view returns (euint256) {
        return _salary[company][employee];
    }

    function totalPayrollHandle(address company) external view returns (euint256) {
        return _totalPayroll[company];
    }

    // --- Public metadata (no amounts) ---

    function isInitialized(address company) external view returns (bool) {
        return _initialized[company];
    }

    function employeeCount(address company) external view returns (uint256) {
        return _employees[company].length;
    }

    function employeeAt(address company, uint256 index) external view returns (address) {
        return _employees[company][index];
    }

    function employees(address company) external view returns (address[] memory) {
        return _employees[company];
    }
}
