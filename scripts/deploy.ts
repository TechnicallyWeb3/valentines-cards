import { ethers } from "hardhat";
import hre from "hardhat";
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
    day: 14
  };

  const contractJson = "https://eternal.cards/contract.json";

  // Set mint prices
  const mintPrice = {
    card: ethers.parseEther("3"),    // 0.01 ETH per card
    message: ethers.parseEther("15")  // 0.005 ETH per message
  };

  // Deploy ValentineNFT
  console.log("Deploying ValentineNFT...");
  const ValentineNFT = await ethers.getContractFactory("ValentineNFT");
  const valentineNFT = await ValentineNFT.deploy(
    "Eternal Cards",
    "ECARD", 
    traitIds,
    traitNames,
    SVG_ASSEMBLER_ADDRESS,
    mintPrice,
    valentineDate,
    contractJson
  );

  // console.log("Verifying ValentineNFT...");
  // await hre.run("verify:verify", {
  //   address: "0xc82cE02df7D108D3A7D260B45aA69E9ec4013CEB", // polygon
  //   constructorArguments: [
  //     "Eternal Cards",
  //     "ECARD",
  //     traitIds,
  //     traitNames,
  //     SVG_ASSEMBLER_ADDRESS,
  //     mintPrice,
  //     valentineDate,
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