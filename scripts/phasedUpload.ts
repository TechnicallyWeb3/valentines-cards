import { ethers } from 'ethers';
import hre from 'hardhat';
import { traits } from '../artwork/valentines.svg';

// Configuration
const MIN_GAS_PRICE_GWEI = 10;
const GAS_CHECK_INTERVAL = 10000; // 10 seconds
const GENERAL_CHECK_INTERVAL = 500; // 0.5 seconds
const DPR_ADDRESS = '0x9885FF0546C921EFb19b1C8a2E10777A9dAc8e88';
const VALENTINE_NFT_ADDRESS = '0x611DbCE9851b36A910284a3835145F99F28606c0';

// State management
enum UploadPhase {
    INITIALIZE,
    QUEUE_TRAIT,
    MONITOR_GAS,
    SEND_TRANSACTION,
    WAIT_FOR_TRANSACTION,
    COMPLETE
}

interface UploadState {
    phase: UploadPhase;
    currentTraitIndex: number;
    queuedTrait: QueuedTrait | null;
    contracts: {
        signer: any;
        dpr: any;
        valentine: any;
    } | null;
    lastBlockWritten: number;
    lastGasCheck?: number;
}

interface QueuedTrait {
    categoryId: string;
    name: string;
    svg: string;
    dataPointAddress: string;
    royalty: bigint;
}

// Initialize state
const state: UploadState = {
    phase: UploadPhase.INITIALIZE,
    currentTraitIndex: 0,
    queuedTrait: null,
    contracts: null,
    lastBlockWritten: 0
};

// Get flattened trait data
const svgData = Object.values(traits)
    .flatMap((category) =>
        category.traits.map(trait => ({
            categoryId: category.id,
            name: trait.name,
            svg: trait.svg
        }))
    );

// Phase handlers
async function handleInitialize(): Promise<void> {
    if (!state.contracts) {
        const [signer] = await hre.ethers.getSigners();
        const dpr = await hre.ethers.getContractAt('DataPointRegistry', DPR_ADDRESS, signer);
        const valentine = await hre.ethers.getContractAt('ValentineNFT', VALENTINE_NFT_ADDRESS, signer);
        
        state.contracts = { signer, dpr, valentine };
        console.log('Contracts initialized');
    }
    
    state.phase = UploadPhase.QUEUE_TRAIT;
    state.lastBlockWritten = await hre.ethers.provider.getBlockNumber() - 1;
}

async function handleQueueTrait(): Promise<void> {
    if (state.currentTraitIndex >= svgData.length) {
        state.phase = UploadPhase.COMPLETE;
        return;
    }

    const trait = svgData[state.currentTraitIndex];
    console.log(`Queuing trait ${state.currentTraitIndex}: ${trait.categoryId} - ${trait.name}`);

    // Calculate data point address
    const request = {
        data: trait.svg,
        mimeType: "0x6973",
        charset: "0x7508",
        location: "0x0101"
    };

    const data = ethers.toUtf8Bytes(request.data);
    const packed = ethers.concat([
        ethers.getBytes(request.mimeType),
        ethers.getBytes(request.charset),
        ethers.getBytes(request.location),
        data
    ]);
    const dataPointAddress = ethers.keccak256(packed);
    
    // Check royalty
    const royalty = await state.contracts!.dpr.getRoyalty(dataPointAddress);

    if (royalty > 0n) {
        console.log(`Skipping trait ${state.currentTraitIndex} - has royalty of ${royalty}`);
        state.currentTraitIndex++;
        return;
    }

    state.queuedTrait = {
        ...trait,
        dataPointAddress,
        royalty
    };

    state.phase = UploadPhase.MONITOR_GAS;
}

async function handleGasMonitoring(): Promise<void> {
    const gasPrice = await hre.ethers.provider.getFeeData();
    const gasPriceInGwei = ethers.formatUnits(gasPrice.gasPrice || 0n, 'gwei');
    console.log(`Current gas price: ${gasPriceInGwei} Gwei`);

    if (parseFloat(gasPriceInGwei) < MIN_GAS_PRICE_GWEI) {
        state.phase = UploadPhase.SEND_TRANSACTION;
    }
}

async function handleTransaction(): Promise<void> {
    const currentBlock = await hre.ethers.provider.getBlockNumber();

    try {
        if (currentBlock <= state.lastBlockWritten) {
            console.log('Waiting for next block...');
            return;
        }
        state.phase = UploadPhase.WAIT_FOR_TRANSACTION;

        const trait = state.queuedTrait!;
        console.log(`Attempting to upload trait: ${trait.categoryId} - ${trait.name}`);

        // // Estimate gas first
        // const gasEstimate = await state.contracts!.valentine.setSVGLayer.estimateGas(
        //     trait.categoryId,
        //     trait.name,
        //     trait.svg,
        //     { value: trait.royalty }
        // );

        // console.log(`Estimated gas: ${gasEstimate}`);

        const tx = await state.contracts!.valentine.setSVGLayer(
            trait.categoryId,
            trait.name,
            trait.svg,
            {
                value: trait.royalty,
                // gasLimit: gasEstimate * 120n / 100n
            }
        );

        const receipt = await tx.wait();
        console.log(`Transaction sent: ${tx.hash}`);
        
        state.lastBlockWritten = receipt.blockNumber;
        state.currentTraitIndex++;
        state.queuedTrait = null;
        state.phase = UploadPhase.QUEUE_TRAIT;
        
        console.log(`Successfully uploaded trait ${state.currentTraitIndex - 1}`);
    } catch (error) {
        console.error('Transaction failed:', error);
        // On failure, reset this trait and try again
        state.queuedTrait = null;
        state.phase = UploadPhase.QUEUE_TRAIT;
        if (currentBlock - state.lastBlockWritten > 1000) {
            state.lastBlockWritten = currentBlock;
        }
    }
}

// Main loop
async function processPhase(): Promise<void> {
    // Skip gas monitoring if it's too soon
    if (state.phase === UploadPhase.MONITOR_GAS) {
        const now = Date.now();
        if (!state.lastGasCheck || now - state.lastGasCheck >= GAS_CHECK_INTERVAL) {
            await handleGasMonitoring();
            state.lastGasCheck = now;
        }
        return;
    }

    switch (state.phase) {
        case UploadPhase.INITIALIZE:
            await handleInitialize();
            break;
        case UploadPhase.QUEUE_TRAIT:
            await handleQueueTrait();
            break;
        case UploadPhase.SEND_TRANSACTION:
            await handleTransaction();
            break;
        case UploadPhase.COMPLETE:
            console.log('Upload complete!');
            process.exit(0);
    }
}

// Start the upload process
console.log(`Starting phased upload for ${svgData.length} traits`);
setInterval(processPhase, GENERAL_CHECK_INTERVAL);
processPhase(); // Run immediately on start 