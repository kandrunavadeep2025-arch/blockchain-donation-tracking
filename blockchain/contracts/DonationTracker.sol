
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DonationTracker {
    address public admin;
    string public projectName = "DonateChain";

    mapping(address => bool) public authorizedNGO;

    enum CampaignStatus {
        Pending,
        Active,
        Completed,
        Removed
    }

    struct Campaign {
        uint256 id;
        address ngo;
        string name;
        string description;
        string imageUrl;
        uint256 goalAmount; // wei
        uint256 totalRaised; // wei
        uint256 totalPaid; // wei
        CampaignStatus status;
        uint256 createdAt;
    }

    struct Donation {
        address donor;
        uint256 amount;
        uint256 campaignId;
        uint256 timestamp;
    }

    struct Expense {
        uint256 campaignId;
        uint256 amount;
        string purpose;
        uint256 timestamp;
        bool verified;
        bool released;
        address payable recipient;
    }

    Campaign[] private campaigns;
    Donation[] public donations;
    Expense[] public expenses;

    // Amounts are stored in wei.
    mapping(uint256 => uint256) public campaignDonations;
    mapping(uint256 => uint256) public campaignExpenses;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin allowed");
        _;
    }

    modifier onlyNGO() {
        require(
            authorizedNGO[msg.sender],
            "Only authorized NGO allowed"
        );
        _;
    }

    event NGOAuthorizationUpdated(
        address indexed ngo,
        bool authorized
    );

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed ngo,
        string name,
        uint256 goalAmount
    );

    event CampaignStatusChanged(
        uint256 indexed campaignId,
        CampaignStatus status
    );

    event DonationReceived(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount,
        uint256 totalRaised
    );

    event ExpenseRecorded(
        uint256 indexed expenseIndex,
        uint256 indexed campaignId,
        address indexed recipient,
        uint256 amount
    );

    event ExpenseVerified(
        uint256 indexed expenseIndex,
        address indexed admin
    );

    event FundsReleased(
        uint256 indexed expenseIndex,
        uint256 indexed campaignId,
        address indexed recipient,
        uint256 amount
    );

    constructor() {
        admin = msg.sender;
    }

    function setNGO(address ngo, bool status) external onlyAdmin {
        require(ngo != address(0), "Invalid NGO address");

        authorizedNGO[ngo] = status;

        emit NGOAuthorizationUpdated(ngo, status);
    }

    // Authorized NGO wallets create campaigns.
    // All new campaigns begin pending admin approval.
    function createCampaign(
        string calldata name,
        string calldata description,
        uint256 goalAmount,
        string calldata imageUrl
    ) external onlyNGO returns (uint256 campaignId) {
        require(bytes(name).length > 0, "Name is required");
        require(
            bytes(description).length > 0,
            "Description is required"
        );
        require(goalAmount > 0, "Goal must be greater than zero");

        campaignId = campaigns.length + 1;

        campaigns.push(
            Campaign({
                id: campaignId,
                ngo: msg.sender,
                name: name,
                description: description,
                imageUrl: imageUrl,
                goalAmount: goalAmount,
                totalRaised: 0,
                totalPaid: 0,
                status: CampaignStatus.Pending,
                createdAt: block.timestamp
            })
        );

        emit CampaignCreated(
            campaignId,
            msg.sender,
            name,
            goalAmount
        );
    }

    function approveCampaign(
        uint256 campaignId
    ) external onlyAdmin {
        require(
            campaignId > 0 && campaignId <= campaigns.length,
            "Invalid campaign ID"
        );

        Campaign storage campaign = campaigns[campaignId - 1];

        require(
            campaign.status == CampaignStatus.Pending,
            "Campaign is not pending"
        );

        campaign.status = CampaignStatus.Active;

        emit CampaignStatusChanged(
            campaignId,
            campaign.status
        );
    }

    // Removal hides a campaign from new donations.
    // Historical transactions are never deleted.
    function removeCampaign(
        uint256 campaignId
    ) external onlyAdmin {
        require(
            campaignId > 0 && campaignId <= campaigns.length,
            "Invalid campaign ID"
        );

        Campaign storage campaign = campaigns[campaignId - 1];

        require(
            campaign.status != CampaignStatus.Removed,
            "Campaign already removed"
        );

        campaign.status = CampaignStatus.Removed;

        emit CampaignStatusChanged(
            campaignId,
            campaign.status
        );
    }

    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    function getCampaign(
        uint256 campaignId
    )
        external
        view
        returns (
            uint256 id,
            address ngo,
            string memory name,
            string memory description,
            string memory imageUrl,
            uint256 goalAmount,
            uint256 totalRaised,
            uint256 totalPaid,
            uint8 status,
            uint256 createdAt
        )
    {
        require(
            campaignId > 0 && campaignId <= campaigns.length,
            "Invalid campaign ID"
        );

        Campaign storage campaign = campaigns[campaignId - 1];

        return (
            campaign.id,
            campaign.ngo,
            campaign.name,
            campaign.description,
            campaign.imageUrl,
            campaign.goalAmount,
            campaign.totalRaised,
            campaign.totalPaid,
            uint8(campaign.status),
            campaign.createdAt
        );
    }

    function donate(uint256 campaignId) external payable {
        require(
            campaignId > 0 && campaignId <= campaigns.length,
            "Invalid campaign ID"
        );

        Campaign storage campaign = campaigns[campaignId - 1];

        require(
            campaign.status == CampaignStatus.Active,
            "Campaign is not accepting donations"
        );

        require(msg.value > 0, "Donation must be greater than zero");

        uint256 remaining = campaign.goalAmount - campaign.totalRaised;

        require(msg.value <= remaining, "Donation exceeds remaining goal");

        campaign.totalRaised += msg.value;
        campaignDonations[campaignId] += msg.value;

        donations.push(
            Donation({
                donor: msg.sender,
                amount: msg.value,
                campaignId: campaignId,
                timestamp: block.timestamp
            })
        );

        emit DonationReceived(
            campaignId,
            msg.sender,
            msg.value,
            campaign.totalRaised
        );

        if (campaign.totalRaised == campaign.goalAmount) {
            campaign.status = CampaignStatus.Completed;

            emit CampaignStatusChanged(
                campaignId,
                campaign.status
            );
        }
    }

    // NGO can reserve an expense against its own campaign.
    // Expenses can be recorded for funded completed or removed
    // campaigns, but pending campaigns cannot incur expenses.
    function recordExpense(
        uint256 campaignId,
        uint256 amount,
        string memory purpose,
        address payable recipient
    ) external onlyNGO {
        require(
            campaignId > 0 && campaignId <= campaigns.length,
            "Invalid campaign ID"
        );

        Campaign storage campaign = campaigns[campaignId - 1];

        require(
            campaign.status != CampaignStatus.Pending,
            "Campaign has not been approved"
        );

        require(
            campaign.ngo == msg.sender,
            "NGO does not own this campaign"
        );

        require(amount > 0, "Amount must be greater than zero");
        require(recipient != address(0), "Invalid recipient");
        require(bytes(purpose).length > 0, "Purpose is required");

        uint256 alreadyReserved = campaignExpenses[campaignId];

        require(
            alreadyReserved <= campaign.totalRaised,
            "Invalid campaign accounting"
        );

        require(
            amount <= campaign.totalRaised - alreadyReserved,
            "Insufficient unreserved campaign funds"
        );

        uint256 expenseIndex = expenses.length;

        expenses.push(
            Expense({
                campaignId: campaignId,
                amount: amount,
                purpose: purpose,
                timestamp: block.timestamp,
                verified: false,
                released: false,
                recipient: recipient
            })
        );

        campaignExpenses[campaignId] += amount;

        emit ExpenseRecorded(
            expenseIndex,
            campaignId,
            recipient,
            amount
        );
    }

    function verifyExpense(uint256 index) external onlyAdmin {
        require(index < expenses.length, "Invalid expense index");

        Expense storage expense = expenses[index];

        require(!expense.verified, "Already verified");
        require(!expense.released, "Already released");

        expense.verified = true;

        emit ExpenseVerified(index, msg.sender);
    }

    // Real ETH transfer on the connected blockchain.
    // On Hardhat this is test ETH, not real-world money.
    function releaseFunds(uint256 index) external onlyAdmin {
        require(index < expenses.length, "Invalid expense index");

        Expense storage expense = expenses[index];

        require(expense.verified, "Expense not verified");
        require(!expense.released, "Funds already released");

        require(
            address(this).balance >= expense.amount,
            "Insufficient contract balance"
        );

        expense.released = true;

        Campaign storage campaign =
            campaigns[expense.campaignId - 1];

        campaign.totalPaid += expense.amount;

        (bool success, ) =
            expense.recipient.call{value: expense.amount}("");

        require(success, "Payment failed");

        emit FundsReleased(
            index,
            expense.campaignId,
            expense.recipient,
            expense.amount
        );
    }

    function getExpenseCount() external view returns (uint256) {
        return expenses.length;
    }

    // Kept compatible with the existing frontend's getExpense call.
    function getExpense(
        uint256 index
    )
        external
        view
        returns (
            uint256 campaignId,
            uint256 amount,
            string memory purpose,
            uint256 timestamp,
            bool verified
        )
    {
        require(index < expenses.length, "Invalid expense index");

        Expense storage expense = expenses[index];

        return (
            expense.campaignId,
            expense.amount,
            expense.purpose,
            expense.timestamp,
            expense.verified
        );
    }

    function getExpenseDetails(
        uint256 index
    )
        external
        view
        returns (
            uint256 campaignId,
            uint256 amount,
            string memory purpose,
            uint256 timestamp,
            bool verified,
            bool released,
            address recipient
        )
    {
        require(index < expenses.length, "Invalid expense index");

        Expense storage expense = expenses[index];

        return (
            expense.campaignId,
            expense.amount,
            expense.purpose,
            expense.timestamp,
            expense.verified,
            expense.released,
            expense.recipient
        );
    }

    function getDonationCount() external view returns (uint256) {
        return donations.length;
    }

    function getDonation(
        uint256 index
    )
        external
        view
        returns (
            address donor,
            uint256 amount,
            uint256 campaignId,
            uint256 timestamp
        )
    {
        require(index < donations.length, "Invalid donation index");

        Donation storage donation = donations[index];

        return (
            donation.donor,
            donation.amount,
            donation.campaignId,
            donation.timestamp
        );
    }
}
