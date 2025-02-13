import { ethers } from "hardhat";
import { traits } from "../artwork/valentines.svg";

// Contract addresses
const SVG_ASSEMBLER_ADDRESS = "0x07f26a3612577282Bc1f62f9E0C567D7a61634c9";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  // process.exit(0);
  // Get trait IDs and names from the traits data
  const traitIds = Object.values(traits).map(category => category.id);
  const traitNames = traitIds.map(id => id.charAt(0) + id.slice(1).toLowerCase());

  // Set Valentine's date
  const valentineDate = {
    month: 2, // February
    day: 13
  };

  const contractJson = "https://eternal.cards/contract.json";

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
    valentineDate,
    contractJson
  );

  // console.log("Verifying ValentineNFT...");
  // await hre.run("verify:verify", {
  //   address: "0x2F2DAa6af903B01F6F87011242386F686bc61ce1",
  //   constructorArguments: [
  //     "Valentine NFT",
  //     "VNFT",
  //     traitIds,
  //     traitNames,
  //     SVG_ASSEMBLER_ADDRESS,
  //     mintPrice,
  //     contractJson
  //   ]
  // });

  // {"name":"Valentine NFT","symbol":"VNFT","traitIds":["BACKGROUND","ILLUSTRATION","TEXT"],"traitNames":["Background","Illustration","Text"],"svgAssemblerAddress":"0x2fA6E676F8645C9D28a9D1959DBD2B41F957E7BC","mintPrice":{"card":1000000000000000,"message":5000000000000000},"contractJson":"https://eternal.cards/contract.json"}  

    // process.exit(0);
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