import hre from "hardhat";

async function getPendingTransactions(signerAddress: string) {
    const provider = hre.ethers.provider;
    
    // Get the pending block (transactions in mempool)
    const pendingBlock = await provider.send("eth_getBlockByNumber", ["pending", true]);
    
    if (!pendingBlock || !pendingBlock.transactions) {
        console.log("No pending transactions found");
        return 0;
    }

    // Filter transactions for the specific signer
    const pendingTxs = pendingBlock.transactions.filter(
        (tx: any) => tx.from.toLowerCase() === signerAddress.toLowerCase()
    );

    console.log(`Found ${pendingTxs.length} pending transactions for address ${signerAddress}`);
    
    // Optionally print details of each pending transaction
    pendingTxs.forEach((tx: any, index: number) => {
        console.log(`\nTransaction ${index + 1}:`);
        console.log(`Hash: ${tx.hash}`);
        console.log(`To: ${tx.to}`);
        console.log(`Value: ${hre.ethers.formatEther(tx.value)} ETH`);
        console.log(`Nonce: ${tx.nonce}`);
    });

    return pendingTxs.length;
}

async function main() {
    // Get the first signer from your hardhat config
    const [signer, signer2] = await hre.ethers.getSigners();
    const signerAddress = signer.address;

    console.log(`Signer 1: ${signerAddress}`);
    console.log(`Signer 2: ${signer2.address}`);

    console.log(`Checking pending transactions for ${signerAddress}`);
    
    try {
        await getPendingTransactions(signerAddress);
    } catch (error) {
        console.error("Error checking pending transactions:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
}); 