import { ethers } from "hardhat";

const VALENTINE_NFT_ADDRESS = "0x372D61a4B4A5F7C5B133F628F99879E02c9BaCCD";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Using scheduler address:", signer.address);

  // Get contract instance
  const ValentineNFT = await ethers.getContractFactory("ValentineNFT");
  const valentineNFT = await ValentineNFT.attach(VALENTINE_NFT_ADDRESS);

  // Create array of 100 valentines
  const valentines = Array(100).fill(null).map(() => ({
    to: signer.address,
    from: signer.address,
    message: "Test Valentine #" + Math.floor(Math.random() * 1000)
  }));

  console.log(`Attempting to mint 100 valentines to ${signer.address}`);

  try {
    // Call schedulerMint function
    const tx = await valentineNFT.schedulerMint(valentines);
    console.log("Transaction sent:", tx.hash);

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);

    // Get minted token IDs from events
    const mintEvents = receipt.logs
      .map(log => {
        try {
          return valentineNFT.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .filter(event => event && event.name === 'Transfer');

    console.log(`Successfully minted ${mintEvents.length} valentines`);
    console.log("First token ID:", mintEvents[0].args.tokenId.toString());
    console.log("Last token ID:", mintEvents[mintEvents.length - 1].args.tokenId.toString());

  } catch (error) {
    console.error("Error minting valentines:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
