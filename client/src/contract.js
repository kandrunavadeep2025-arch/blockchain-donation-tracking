
import { ethers } from "ethers";
import { provider } from "./blockchain";

export const contractAddress =
  "0x196F8A01D147ca8e2902E63AD939d32d3EDDaa41";

export const abi = [
  "function projectName() view returns (string)",
  "function admin() view returns (address)",
  "function authorizedNGO(address) view returns (bool)",
  "function setNGO(address ngo, bool status)",

  "function createCampaign(string name, string description, uint256 goalAmount, string imageUrl) returns (uint256 campaignId)",
  "function approveCampaign(uint256 campaignId)",
  "function removeCampaign(uint256 campaignId)",
  "function getCampaignCount() view returns (uint256)",
  "function getCampaign(uint256 campaignId) view returns (uint256 id, address ngo, string name, string description, string imageUrl, uint256 goalAmount, uint256 totalRaised, uint256 totalPaid, uint8 status, uint256 createdAt)",

  "function donate(uint256 campaignId) payable",
  "function getDonationCount() view returns (uint256)",
  "function getDonation(uint256 index) view returns (address donor, uint256 amount, uint256 campaignId, uint256 timestamp)",
  "function campaignDonations(uint256) view returns (uint256)",

  "function recordExpense(uint256 campaignId, uint256 amount, string purpose, address recipient)",
  "function verifyExpense(uint256 index)",
  "function releaseFunds(uint256 index)",
  "function getExpenseCount() view returns (uint256)",
  "function getExpense(uint256 index) view returns (uint256 campaignId, uint256 amount, string purpose, uint256 timestamp, bool verified)",
  "function getExpenseDetails(uint256 index) view returns (uint256 campaignId, uint256 amount, string purpose, uint256 timestamp, bool verified, bool released, address recipient)",
  "function campaignExpenses(uint256) view returns (uint256)",

  "event CampaignCreated(uint256 indexed campaignId, address indexed ngo, string name, uint256 goalAmount)"
];

export const contract = new ethers.Contract(
  contractAddress,
  abi,
  provider
);
