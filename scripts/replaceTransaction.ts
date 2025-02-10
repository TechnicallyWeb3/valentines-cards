import { ethers } from "hardhat";
import hre from "hardhat";

const PENDING_TX_HASH = '0x8e14c5f2dee9f93af27f31e7e8353e21cb628ef4cf27bde724e61139a3f4e877';
const DPR_ADDRESS = '0x9885FF0546C921EFb19b1C8a2E10777A9dAc8e88';

async function replaceTransaction(txHash: string) {
    // First check if transaction is already confirmed
    const tx = await hre.ethers.provider.getTransaction(txHash);
    if (!tx) {
        throw new Error("Transaction not found");
    }

    // Get transaction receipt to check status
    const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
    if (receipt) {
        // If we have a receipt, the transaction is already confirmed
        throw new Error(`Transaction ${txHash} has already been confirmed in block ${receipt.blockNumber}`);
    }

    // If we get here, transaction is still pending and can be replaced
    console.log(`Original maxFeePerGas: ${ethers.formatUnits(tx.maxFeePerGas || 0n, 'gwei')} Gwei`);
    
    const [signer] = await hre.ethers.getSigners();
    const dpr = await hre.ethers.getContractAt('DataPointRegistry', DPR_ADDRESS, signer);

    // Get current gas prices
    const gasPrice = await hre.ethers.provider.getFeeData();
    
    // Increase priority fee by 50%
    const newPriorityFee = gasPrice.maxPriorityFeePerGas! * 150n / 100n;
    // Make maxFeePerGas higher than priority fee (priority fee + current base fee + buffer)
    const newMaxFeePerGas = newPriorityFee + gasPrice.maxFeePerGas! + 50000000000n; // +50 Gwei buffer

    console.log("Original maxFeePerGas:", ethers.formatUnits(gasPrice.maxFeePerGas || 0n, "gwei"), "Gwei");
    console.log("New maxFeePerGas:", ethers.formatUnits(newMaxFeePerGas, "gwei"), "Gwei");
    console.log("New priorityFee:", ethers.formatUnits(newPriorityFee, "gwei"), "Gwei");

    // Create replacement transaction with same data but higher fees
    try {
        const decodedData = dpr.interface.parseTransaction({ data: tx.data });
        // Add custom replacer function to handle BigInt serialization
        const replacer = (key: string, value: any) => {
            if (typeof value === 'bigint') {
                return value.toString();
            }
            return value;
        };
        // console.log("Decoded transaction data:", JSON.stringify(decodedData, replacer, 2));
        
        // Create the DataPoint struct exactly matching the contract structure
        const dataPointStruct = {
            structure: {
                mimeType: decodedData?.args[0].structure.mimeType,
                charset: decodedData?.args[0].structure.charset,
                location: decodedData?.args[0].structure.location
            },
            data: decodedData?.args[0].data
        };
        
        // Use the same replacer for the struct logging
        console.log("Prepared struct:", JSON.stringify(dataPointStruct, replacer, 2));
        const publisherAddress = decodedData?.args[1];

        const populatedTx = await dpr.writeDataPoint.populateTransaction(
            dataPointStruct,
            publisherAddress,
            {
                nonce: tx.nonce,
                gasLimit: 30000000,
                maxFeePerGas: newMaxFeePerGas,
                maxPriorityFeePerGas: newPriorityFee,
            }
        );

        console.log("Sending replacement transaction...");
        const response = await signer.sendTransaction(populatedTx);
        console.log("Replacement transaction sent:", response.hash);

        const receipt = await response.wait();
        console.log("Transaction confirmed in block:", receipt?.blockNumber);
        console.log("Gas used:", receipt?.gasUsed.toString());
        console.log("Effective gas price:", ethers.formatUnits(receipt?.gasPrice || 0n, "gwei"), "Gwei");
    } catch (error: any) {
        console.error("Error replacing transaction:", error);
        if (error.data) {
            console.error("Detailed error data:", error.data);
        }
        throw error;
    }
}

replaceTransaction(PENDING_TX_HASH)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 