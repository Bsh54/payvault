// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

/// @title PayrollVault
/// @notice Confidential payroll registry built on Nox.
///         Individual salaries are stored as encrypted handles (euint256) and are
///         only decryptable by the company (owner) and the employee themselves.
///         An encrypted running total is maintained so that an authorized auditor
///         can verify the aggregate payroll WITHOUT ever seeing individual salaries
///         (selective disclosure).
/// @dev    The underlying public protocols (Safe treasury / Sablier funding stream)
///         are never modified: this contract layers confidentiality on top of them.
contract PayrollVault {
    address public owner;

    address[] private _employees;
    mapping(address => bool) public isEmployee;

    // Encrypted monthly salary per employee (handle → off-chain encrypted value).
    mapping(address => euint256) private _salary;

    // Encrypted sum of all salaries (for auditor selective disclosure).
    euint256 private _totalPayroll;

    mapping(address => bool) public isAuditor;

    // Public events carry NO amounts — only addresses, so on-chain observers
    // learn "who is on payroll" at most, never "how much".
    event EmployeeAdded(address indexed employee);
    event SalaryUpdated(address indexed employee);
    event EmployeeRemoved(address indexed employee);
    event AuditorGranted(address indexed auditor);
    event AuditorRevoked(address indexed auditor);

    modifier onlyOwner() {
        require(msg.sender == owner, "PayrollVault: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        _totalPayroll = Nox.toEuint256(0);
        Nox.allowThis(_totalPayroll);
        Nox.allow(_totalPayroll, owner);
    }

    /// @notice Add an employee with an encrypted salary.
    /// @param employee     the employee wallet address
    /// @param inputHandle  handle of the encrypted salary, produced off-chain by the JS SDK
    /// @param inputProof   proof that the handle was created by a legitimate Gateway
    function addEmployee(
        address employee,
        externalEuint256 inputHandle,
        bytes calldata inputProof
    ) external onlyOwner {
        require(employee != address(0), "PayrollVault: zero address");
        require(!isEmployee[employee], "PayrollVault: already employee");

        euint256 salary = Nox.fromExternal(inputHandle, inputProof);

        _salary[employee] = salary;
        isEmployee[employee] = true;
        _employees.push(employee);

        _totalPayroll = Nox.add(_totalPayroll, salary);

        // ACL: company + employee can read the salary; contract can reuse it.
        Nox.allowThis(salary);
        Nox.allow(salary, owner);
        Nox.allow(salary, employee);

        // ACL: keep total reusable by the contract and readable by the company.
        Nox.allowThis(_totalPayroll);
        Nox.allow(_totalPayroll, owner);

        emit EmployeeAdded(employee);
    }

    /// @notice Update an existing employee's encrypted salary.
    /// @dev    total = total + newSalary - oldSalary, all on encrypted values.
    function updateSalary(
        address employee,
        externalEuint256 inputHandle,
        bytes calldata inputProof
    ) external onlyOwner {
        require(isEmployee[employee], "PayrollVault: not employee");

        euint256 newSalary = Nox.fromExternal(inputHandle, inputProof);
        euint256 oldSalary = _salary[employee];

        _totalPayroll = Nox.sub(Nox.add(_totalPayroll, newSalary), oldSalary);
        _salary[employee] = newSalary;

        Nox.allowThis(newSalary);
        Nox.allow(newSalary, owner);
        Nox.allow(newSalary, employee);

        Nox.allowThis(_totalPayroll);
        Nox.allow(_totalPayroll, owner);

        emit SalaryUpdated(employee);
    }

    /// @notice Grant an auditor read access to the AGGREGATE payroll only.
    ///         This is selective disclosure: the auditor can decrypt the total,
    ///         but has no access to any individual salary handle.
    function grantAuditor(address auditor) external onlyOwner {
        require(auditor != address(0), "PayrollVault: zero address");
        isAuditor[auditor] = true;
        Nox.allow(_totalPayroll, auditor);
        emit AuditorGranted(auditor);
    }

    /// @notice Revoke an auditor flag (off-chain views rely on the ACL snapshot).
    function revokeAuditor(address auditor) external onlyOwner {
        isAuditor[auditor] = false;
        emit AuditorRevoked(auditor);
    }

    // --- Encrypted handle getters (values only decryptable by ACL'd addresses) ---

    /// @notice Returns the encrypted salary handle of an employee.
    function salaryHandleOf(address employee) external view returns (euint256) {
        return _salary[employee];
    }

    /// @notice Returns the encrypted total-payroll handle.
    function totalPayrollHandle() external view returns (euint256) {
        return _totalPayroll;
    }

    // --- Public metadata (no amounts) ---

    function employeeCount() external view returns (uint256) {
        return _employees.length;
    }

    function employeeAt(uint256 index) external view returns (address) {
        return _employees[index];
    }

    function employees() external view returns (address[] memory) {
        return _employees;
    }
}
