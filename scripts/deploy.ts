import { ethers } from "hardhat";
import { traits } from "../artwork/valentines.svg";

// Contract addresses
const SVG_ASSEMBLER_ADDRESS = "0x5fDE221cbDC53CA52D2Aef2D915b1522D1A6e37F";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Get trait IDs and names from the traits data
  const traitIds = Object.values(traits).map(category => category.id);
  const traitNames = traitIds.map(id => id.charAt(0) + id.slice(1).toLowerCase());

  // Set Valentine's date
  const valentineDate = {
    month: 2, // February
    day: 6
  };

  // Set mint prices
  const mintPrice = {
    card: ethers.parseEther("0.001"),    // 0.01 ETH per card
    message: ethers.parseEther("0.005")  // 0.005 ETH per message
  };

  // Deploy ValentineNFT
  console.log("Deploying ValentineNFT...");
  const ValentineNFT = await ethers.getContractFactory("ValentineNFT");
  const valentineNFT = await ValentineNFT.deploy(
    "Valentine NFT",
    "VNFT",
    traitIds,
    traitNames,
    SVG_ASSEMBLER_ADDRESS,
    mintPrice,
    valentineDate
  );
  await valentineNFT.waitForDeployment();
  
  console.log("ValentineNFT deployed to:", await valentineNFT.getAddress());
  console.log("ValentineNFT Address:", valentineNFT.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 