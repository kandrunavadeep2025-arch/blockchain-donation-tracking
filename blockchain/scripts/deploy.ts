import { network } from "hardhat";

const { ethers } = await network.create({ network: "sepolia" });

const donationTracker = await ethers.deployContract("DonationTracker");

await donationTracker.waitForDeployment();

console.log(
  "DonationTracker deployed to:",
  await donationTracker.getAddress()
);