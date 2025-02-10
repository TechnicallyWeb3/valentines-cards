import { ethers } from "hardhat";
import hre from "hardhat";

async function testAccount() {
    try {
        // Get signer
        const [signer] = await hre.ethers.getSigners();
        
        // Get current address
        const address = await signer.getAddress();
        console.log("Testing account:", address);

        // Get current balance
        const balance = await signer.provider.getBalance(address);
        console.log("Current balance:", ethers.formatEther(balance), "ETH");

        // Get current gas price
        const feeData = await signer.provider.getFeeData();
        const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice;
        console.log("Current gas price:", ethers.formatUnits(maxFeePerGas || 0n, "gwei"), "Gwei");

        // Estimate gas for a simple transfer
        const estimatedGas = await signer.estimateGas({
            to: address,
            value: 0
        });

        // Send 0 ETH transaction to self
        const tx = await signer.sendTransaction({
            to: address,
            value: 0,
            maxFeePerGas: maxFeePerGas || 25000000000n * 150n / 100n, // add 50% buffer
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || 25000000000n * 150n / 100n // add 50% buffer
        });

        console.log("Test transaction sent:", tx.hash);

        // Wait for confirmation
        const receipt = await tx.wait();
        console.log("Transaction confirmed in block:", receipt?.blockNumber);
        console.log("Gas used:", receipt?.gasUsed.toString());
        console.log("Effective gas price:", ethers.formatUnits(receipt?.gasPrice || 0n, "gwei"), "Gwei");
        console.log("Test successful! Account is working properly.");

    } catch (error) {
        console.error("Error testing account:", error);
        throw error;
    }
}

// Execute the test
testAccount()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 