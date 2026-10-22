
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("DonateChain - DonationTracker", async function () {
  const { ethers } = await network.connect();

  async function deployFixture() {
    const [admin, ngo, donor, recipient, stranger] =
      await ethers.getSigners();

    const Factory = await ethers.getContractFactory("DonationTracker");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    return { contract, admin, ngo, donor, recipient, stranger };
  }

  it("sets the deployer as admin", async function () {
    const { contract, admin } = await deployFixture();
    assert.equal(await contract.admin(), admin.address);
    assert.equal(await contract.projectName(), "DonateChain");
  });

  it("prevents non-admins from authorizing NGOs", async function () {
    const { contract, stranger, ngo } = await deployFixture();

    await assert.rejects(
      contract.connect(stranger).setNGO(ngo.address, true),
      /Only admin allowed/
    );
  });

  it("allows an authorized NGO to create a pending campaign", async function () {
    const { contract, admin, ngo } = await deployFixture();

    await contract.connect(admin).setNGO(ngo.address, true);

    await contract.connect(ngo).createCampaign(
      "Flood Relief",
      "Emergency support",
      ethers.parseEther("1"),
      ""
    );

    const campaign = await contract.getCampaign(1);

    assert.equal(campaign.id, 1n);
    assert.equal(campaign.ngo, ngo.address);
    assert.equal(campaign.status, 0n); // Pending
    assert.equal(await contract.getCampaignCount(), 1n);
  });

  it("rejects donations before campaign approval", async function () {
    const { contract, admin, ngo, donor } = await deployFixture();

    await contract.setNGO(ngo.address, true);

    await contract.connect(ngo).createCampaign(
      "Flood Relief",
      "Emergency support",
      ethers.parseEther("1"),
      ""
    );

    await assert.rejects(
      contract.connect(donor).donate(1, {
        value: ethers.parseEther("0.1"),
      }),
      /Campaign is not accepting donations/
    );
  });

  it("accepts a valid donation and updates the total", async function () {
    const { contract, admin, ngo, donor } = await deployFixture();

    await contract.setNGO(ngo.address, true);
    await contract.connect(ngo).createCampaign(
      "Flood Relief",
      "Emergency support",
      ethers.parseEther("1"),
      ""
    );
    await contract.connect(admin).approveCampaign(1);

    await contract.connect(donor).donate(1, {
      value: ethers.parseEther("0.2"),
    });

    const campaign = await contract.getCampaign(1);

    assert.equal(campaign.totalRaised, ethers.parseEther("0.2"));
    assert.equal(await contract.getDonationCount(), 1n);
    assert.equal(
      await contract.campaignDonations(1),
      ethers.parseEther("0.2")
    );
  });

  it("rejects donations that exceed the campaign goal", async function () {
    const { contract, admin, ngo, donor } = await deployFixture();

    await contract.setNGO(ngo.address, true);
    await contract.connect(ngo).createCampaign(
      "Flood Relief",
      "Emergency support",
      ethers.parseEther("1"),
      ""
    );
    await contract.connect(admin).approveCampaign(1);

    await assert.rejects(
      contract.connect(donor).donate(1, {
        value: ethers.parseEther("1.1"),
      }),
      /Donation exceeds remaining goal/
    );
  });

  it("prevents an NGO from spending another NGO's campaign funds", async function () {
    const { contract, admin, ngo, stranger, donor, recipient } =
      await deployFixture();

    await contract.setNGO(ngo.address, true);
    await contract.setNGO(stranger.address, true);

    await contract.connect(ngo).createCampaign(
      "Flood Relief",
      "Emergency support",
      ethers.parseEther("1"),
      ""
    );
    await contract.connect(admin).approveCampaign(1);
    await contract.connect(donor).donate(1, {
      value: ethers.parseEther("0.5"),
    });

    await assert.rejects(
      contract.connect(stranger).recordExpense(
        1,
        ethers.parseEther("0.1"),
        "Medical supplies",
        recipient.address
      ),
      /NGO does not own this campaign/
    );
  });

  it("prevents releasing an expense before admin verification", async function () {
    const { contract, admin, ngo, donor, recipient } =
      await deployFixture();

    await contract.setNGO(ngo.address, true);
    await contract.connect(ngo).createCampaign(
      "Flood Relief",
      "Emergency support",
      ethers.parseEther("1"),
      ""
    );
    await contract.connect(admin).approveCampaign(1);
    await contract.connect(donor).donate(1, {
      value: ethers.parseEther("0.5"),
    });

    await contract.connect(ngo).recordExpense(
      1,
      ethers.parseEther("0.1"),
      "Medical supplies",
      recipient.address
    );
 

    await assert.rejects(
      contract.connect(admin).releaseFunds(0),
      /Expense not verified/
    );
  });
it("allows verified expenses to be released to the recipient", async function () {
  const { contract, admin, ngo, donor, recipient } =
    await deployFixture();

  await contract.setNGO(ngo.address, true);

  await contract.connect(ngo).createCampaign(
    "Flood Relief",
    "Emergency support",
    ethers.parseEther("1"),
    ""
  );

  await contract.connect(admin).approveCampaign(1);

  await contract.connect(donor).donate(1, {
    value: ethers.parseEther("0.5"),
  });

  const expenseAmount = ethers.parseEther("0.1");

  await contract.connect(ngo).recordExpense(
    1,
    expenseAmount,
    "Medical supplies",
    recipient.address
  );

  await contract.connect(admin).verifyExpense(0);

  const recipientBalanceBefore = await ethers.provider.getBalance(
    recipient.address
  );

  await contract.connect(admin).releaseFunds(0);

  const recipientBalanceAfter = await ethers.provider.getBalance(
    recipient.address
  );

  assert.equal(
    recipientBalanceAfter - recipientBalanceBefore,
    expenseAmount
  );

  const expense = await contract.getExpenseDetails(0);

  assert.equal(expense.verified, true);
  assert.equal(expense.released, true);

  const campaign = await contract.getCampaign(1);

  assert.equal(campaign.totalPaid, expenseAmount);
});
});	
