import { ethers } from "hardhat";
import hre from "hardhat";

const PENDING_TX_HASH = '0xdfe36cffe4d4d3f4db7dcd4f9c6f1a7ab78aeaca5ebddf63fbee264ea188c956'; // Add your pending transaction hash here

async function cancelTransaction(txHash: string) {
    // First check if transaction is already confirmed
    const tx = await hre.ethers.provider.getTransaction(txHash);
    if (!tx) {
        throw new Error("Transaction not found");
    }

    // Get transaction receipt to check status
    const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
    if (receipt) {
        throw new Error(`Transaction ${txHash} has already been confirmed in block ${receipt.blockNumber} using nonce ${tx.nonce}`);
    }

    // Get signer
    const [signer] = await hre.ethers.getSigners();

    // Get current gas prices
    const gasPrice = await hre.ethers.provider.getFeeData();
    
    // Get original transaction's gas price
    const originalGasPrice = tx.maxFeePerGas || tx.gasPrice;
    
    // Increase by at least 30% from the original transaction's gas price
    const newMaxFeePerGas = (originalGasPrice! * 130n) / 100n;
    const newPriorityFee = (originalGasPrice! * 130n) / 100n;

    console.log("Original transaction gas price:", ethers.formatUnits(originalGasPrice || 0n, "gwei"), "Gwei");
    console.log("New maxFeePerGas:", ethers.formatUnits(newMaxFeePerGas, "gwei"), "Gwei");
    console.log("New priorityFee:", ethers.formatUnits(newPriorityFee, "gwei"), "Gwei");

    try {
        // Estimate gas limit for the cancellation transaction
        const estimatedGas = await signer.estimateGas({
            to: await signer.getAddress(),
            value: 0,
            nonce: tx.nonce
        });

        // Add 20% buffer to the estimated gas
        const gasLimit = (estimatedGas * 120n) / 100n;

        // Send 0 ETH transaction to self with same nonce but higher gas price
        const cancelTx = await signer.sendTransaction({
            to: await signer.getAddress(), // Send to self
            value: 0, // 0 ETH
            nonce: tx.nonce,
            gasLimit: gasLimit, // Calculated gas limit
            maxFeePerGas: newMaxFeePerGas,
            maxPriorityFeePerGas: newPriorityFee,
        });

        console.log("Cancellation transaction sent:", cancelTx.hash);

        const cancelReceipt = await cancelTx.wait();
        console.log("Cancellation confirmed in block:", cancelReceipt?.blockNumber);
        console.log("Gas used:", cancelReceipt?.gasUsed.toString());
        console.log("Effective gas price:", ethers.formatUnits(cancelReceipt?.gasPrice || 0n, "gwei"), "Gwei");
    } catch (error) {
        console.error("Error cancelling transaction:", error);
        throw error;
    }
}

async function cancelTransactionByNonce(nonce: number) {
    const [signer] = await hre.ethers.getSigners();

    try {
        // Estimate gas limit for the cancellation transaction
        const estimatedGas = await signer.estimateGas({
            to: await signer.getAddress(),
            value: 0,
            nonce: nonce
        });

        // Add 20% buffer to the estimated gas
        const gasLimit = (estimatedGas * 120n) / 100n;

        const gasPrice = await hre.ethers.provider.getFeeData();

        const newMaxFeePerGas = (gasPrice.maxFeePerGas! * 111n) / 100n;
        const newPriorityFee = (gasPrice.maxPriorityFeePerGas! * 110n) / 100n;

        let attempt = 1;
        let cancelTx;
        while (true) {
            try {
                const increaseFactor = (100n + BigInt(attempt * 10)) * 100n;
                const attemptMaxFeePerGas = (gasPrice.maxFeePerGas! * increaseFactor) / 10000n;
                const attemptPriorityFee = (gasPrice.maxPriorityFeePerGas! * increaseFactor) / 10000n;

                console.log(`Attempt ${attempt}: Trying with ${ethers.formatUnits(attemptMaxFeePerGas, "gwei")} gwei max fee`);
                
                cancelTx = await signer.sendTransaction({
                    to: await signer.getAddress(),
                    value: 0,
                    nonce: nonce,
                    gasLimit: gasLimit,
                    maxFeePerGas: attemptMaxFeePerGas,
                    maxPriorityFeePerGas: attemptPriorityFee,
                });
                break;
            } catch (error: any) {
                if (!error.message.includes("replacement transaction underpriced")) {
                    throw error;
                }
                attempt++;
                if (attempt > 50) {
                    throw new Error("Failed to find sufficient gas price after 50 attempts");
                }
            }
        }

        console.log("Cancellation transaction sent:", cancelTx.hash);

        const cancelReceipt = await cancelTx.wait();
        console.log("Cancellation confirmed in block:", cancelReceipt?.blockNumber);
        console.log("Gas used:", cancelReceipt?.gasUsed.toString());
        console.log("Effective gas price:", ethers.formatUnits(cancelReceipt?.gasPrice || 0n, "gwei"), "Gwei");
    } catch (error) {
        console.error("Error cancelling transaction:", error);
        throw error;
    }
}


cancelTransactionByNonce(57); 