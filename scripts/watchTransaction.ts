import hre from "hardhat";

const PENDING_TX_HASH = '0xe4924f112a0f88a39167ff4e152dcc980b7f907e20631e0466217f0197e3224d';

async function watchTransaction(txHash: string) {
    // First check if transaction is already confirmed
    const tx = await hre.ethers.provider.getTransaction(txHash.trim());
    if (!tx) {
        throw new Error("Transaction not found");
    }

    // Get transaction receipt to check status
    const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
    if (receipt) {
        // If we have a receipt, the transaction is already confirmed
        throw new Error(`Transaction ${txHash} has already been confirmed in block ${receipt.blockNumber}`);
    }

    console.log(`Transaction ${txHash} is still pending`);
}

async function main() {
    try {
        while (true) {
            await watchTransaction(PENDING_TX_HASH);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    } catch (error) {
        console.log("Transaction confirmed:", (error as Error)?.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

