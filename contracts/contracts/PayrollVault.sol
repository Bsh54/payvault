// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {Nox, euint256, externalEuint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {ERC20ToERC7984Wrapper} from "@iexec-nox/nox-confidential-contracts/contracts/token/extensions/ERC20ToERC7984Wrapper.sol";

/// @dev Minimal Sablier Lockup interface: the recipient (this vault) withdraws vested funds.
///      Sablier charges a small native (ETH) withdrawal fee, forwarded as msg.value.
interface ISablierLockup {
    function withdrawMax(uint256 streamId, address to) external payable returns (uint128);
}

/// @title PayrollVault v3 (multi-tenant, funded through a real Sablier stream)
/// @notice Confidential payroll registry on Nox. Every wallet owns its OWN payroll
///         book keyed by `msg.sender` (the company). Individual salaries are stored as
///         encrypted handles (euint256), decryptable only by the company and the employee.
///         An encrypted running total lets an authorized auditor verify the aggregate
///         payroll WITHOUT seeing individual salaries (selective disclosure).
/// @dev    The vault is an ERC-7984 confidential token ("cPAY") wrapping a public ERC-20
///         (PayUSD). Running payroll mints confidential cPAY to each employee equal to
///         their encrypted salary. An employee can `unwrap` their cPAY back into real
///         public PayUSD via a public-decryption proof — closing the money loop while
///         keeping the amount hidden until the employee themselves cashes out.
contract PayrollVault is ERC20ToERC7984Wrapper {
    // Sablier Lockup on ETH Sepolia (public funding protocol, unmodified).
    address public constant SABLIER = 0xe61cb9153356419bdaD0A8767c059f92d221a3C4;

    constructor(IERC20 payUSD)
        ERC20ToERC7984Wrapper("PayVault Confidential Pay", "cPAY", "", payUSD)
    {}

    // company => has its total been initialized as an encrypted zero?
    mapping(address => bool) private _initialized;
    // company => encrypted sum of all its salaries
    mapping(address => euint256) private _totalPayroll;
    // company => list of employees
    mapping(address => address[]) private _employees;
    // company => employee => 1-based index in _employees (0 = not present)
    mapping(address => mapping(address => uint256)) private _employeeIndex;
    // company => employee => is on payroll
    mapping(address => mapping(address => bool)) public isEmployee;
    // company => employee => encrypted salary handle
    mapping(address => mapping(address => euint256)) private _salary;
    // company => auditor => granted aggregate view
    mapping(address => mapping(address => bool)) public isAuditor;

    // employee => companies that have ever employed them (addresses only, no amounts)
    mapping(address => address[]) private _employersOf;
    mapping(address => mapping(address => bool)) private _isEmployedBy;

    // --- Public funding layer (Sablier) ---
    mapping(address => uint256) public sablierStreamId;
    mapping(address => uint256) public publicBudget;

    // Public events carry NO amounts — only addresses.
    event EmployeeAdded(address indexed company, address indexed employee);
    event EmployeeRemoved(address indexed company, address indexed employee);
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
        _employeeIndex[company][employee] = _employees[company].length;

        if (!_isEmployedBy[employee][company]) {
            _isEmployedBy[employee][company] = true;
            _employersOf[employee].push(company);
        }

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

    /// @notice Remove an employee from the caller's payroll and subtract their
    ///         encrypted salary from the encrypted running total.
    function removeEmployee(address employee) external {
        address company = msg.sender;
        require(isEmployee[company][employee], "PayrollVault: not employee");

        euint256 total = Nox.sub(_totalPayroll[company], _salary[company][employee]);
        _totalPayroll[company] = total;

        // swap-and-pop removal from the employee list
        address[] storage list = _employees[company];
        uint256 idx = _employeeIndex[company][employee]; // 1-based
        uint256 lastPos = list.length - 1;
        address lastEmp = list[lastPos];
        list[idx - 1] = lastEmp;
        _employeeIndex[company][lastEmp] = idx;
        list.pop();

        delete _employeeIndex[company][employee];
        // Note: the encrypted salary handle is a value type and cannot be `delete`d;
        // access is gated by isEmployee, and a later re-add overwrites it.
        isEmployee[company][employee] = false;

        Nox.allowThis(total);
        Nox.allow(total, company);

        emit EmployeeRemoved(company, employee);
    }

    /// @notice Grant an auditor read access to the caller's AGGREGATE payroll only.
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
    function linkFunding(uint256 streamId, uint256 publicAmount) external {
        sablierStreamId[msg.sender] = streamId;
        publicBudget[msg.sender] = publicAmount;
        emit FundingLinked(msg.sender, streamId, publicAmount);
    }

    /// @notice Pull the vested PayUSD from the company's public Sablier stream into the
    ///         vault. This is what actually backs the confidential cPAY payouts: money
    ///         flows company -> Sablier (public) -> vault -> confidential distribution.
    /// @dev    The vault is the stream recipient, so it can withdraw the vested amount.
    function pullFunding() external payable {
        uint256 streamId = sablierStreamId[msg.sender];
        require(streamId != 0, "PayrollVault: no stream");
        ISablierLockup(SABLIER).withdrawMax{value: msg.value}(streamId, address(this));
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

    /// @notice Companies that have ever employed `employee` (addresses only).
    function employersOf(address employee) external view returns (address[] memory) {
        return _employersOf[employee];
    }
}
