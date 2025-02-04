import { ethers } from 'ethers';
import hre from 'hardhat';
import { traits } from '../artwork/valentines.svg';

const MIN_GAS_PRICE_GWEI = 6;
const CHECK_INTERVAL = 10000; // 10 seconds
let lastBlockWritten = 0;
let checkCount = 0;
let traitIndex = 0;

// Contract addresses
const DPR_ADDRESS = '0x9885FF0546C921EFb19b1C8a2E10777A9dAc8e88';
const VALENTINE_NFT_ADDRESS = '0x611DbCE9851b36A910284a3835145F99F28606c0'; // Add your deployed Valentine NFT address

// Global variables for contract instances
let signer: any;
let dpr: any;
let valentine: any;
let initialized = false;

// Initialize contract connections
async function initializeContracts() {
    if (!initialized) {
        [signer] = await hre.ethers.getSigners();
        dpr = await hre.ethers.getContractAt('DataPointRegistry', DPR_ADDRESS, signer);
        valentine = await hre.ethers.getContractAt('ValentineNFT', VALENTINE_NFT_ADDRESS, signer);
        initialized = true;
        console.log('Contracts initialized');
    }
}

interface Trait {
    svg: string;
    [key: string]: any;
}

interface DataPointRequest {
    data: string | Uint8Array;
    mimeType: string;
    charset: string;
    location: string;
}

// Get flattened trait data
const svgData = Object.values(traits)
    .flatMap((category, categoryIndex) =>
        category.traits.map(trait => ({
            categoryId: category.id,
            name: trait.name,
            svg: trait.svg
        }))
    );

console.log(`Traits found: ${svgData.length}`);

async function findNextTrait() {
    let royalty = 1n;

    if (traitIndex === svgData.length) {
        throw new Error('No more traits found');
    }

    let trait = svgData[traitIndex];
    console.log("Checking royalty for trait " + traitIndex);
    let request = {
        data: trait.svg || "<svg></svg>",
        mimeType: "0x6973",
        charset: "0x7508",
        location: "0x0101"
    };


    while (royalty > 0n) {
        traitIndex++;

        // Calculate data point address and check royalty
        const data = ethers.toUtf8Bytes(request.data);
        const packed = ethers.concat([
            ethers.getBytes(request.mimeType),
            ethers.getBytes(request.charset),
            ethers.getBytes(request.location),
            data
        ]);
        const dataPointAddress = ethers.keccak256(packed);
        royalty = await dpr.getRoyalty(dataPointAddress);

        console.log(`Royalty for trait ${traitIndex}: ${royalty}`);

        if (royalty > 0n && traitIndex < svgData.length) {
            console.log(`Skipping trait ${traitIndex}`);
            trait = svgData[traitIndex];
            request = {
                data: trait.svg,
                mimeType: "0x6973",
                charset: "0x7508",
                location: "0x0101"
            };
            setTimeout(() => {}, 1000);
        }

    }

    return { request, royalty, trait };
}

async function checkGasAndProcess() {
    try {
        await initializeContracts();

        checkCount++;
        const gasPrice = await hre.ethers.provider.getFeeData();
        const gasPriceInGwei = ethers.formatUnits(gasPrice.gasPrice || 0n, 'gwei');
        console.log(`${checkCount} - Current gas price: ${gasPriceInGwei} Gwei`);

        if (checkCount % 100 === 0) {
            console.log(`Progress Update - Uploaded ${traitIndex} of ${svgData.length} traits`);
        }

        if (parseFloat(gasPriceInGwei) < MIN_GAS_PRICE_GWEI) {
            console.log(`Gas price is below ${MIN_GAS_PRICE_GWEI} gwei. Processing...`);

            const currentBlock = await hre.ethers.provider.getBlockNumber();
            if (currentBlock > lastBlockWritten) {
                const nextTrait = await findNextTrait();

                if (nextTrait.trait.categoryId && nextTrait.trait.name && nextTrait.trait.svg && nextTrait.royalty === 0n) {
                    console.log("Trait found: " + nextTrait.trait.categoryId + " - " + nextTrait.trait.name);
                    // Add gas settings to ensure transaction goes through
                    // const gasEstimate = await valentine.setSVGLayer.estimateGas(
                    //     nextTrait.trait.categoryId,
                    //     nextTrait.trait.name,
                    //     nextTrait.trait.svg
                    // );
                    
                    // console.log(`Estimated gas: ${gasEstimate}`);

                    const tx = await valentine.setSVGLayer(
                        nextTrait.trait.categoryId,
                        nextTrait.trait.name,
                        nextTrait.trait.svg,
                        // {
                        //     gasLimit: gasEstimate * 120n / 100n
                        // }
                    );

                    lastBlockWritten = currentBlock;

                    console.log(`Processing trait index: ${traitIndex}`);
                    await tx.wait();
                    console.log(`Processed trait index: ${nextTrait.trait.name}`);
                } else {
                    console.log("Trait not valid: " + traitIndex);
                }
            }
        }
    } catch (error) {
        console.error('Error during processing:', error);
    }
}

export function startMonitoring() {
    console.log('Starting gas price monitoring...');
    setInterval(checkGasAndProcess, CHECK_INTERVAL);
    checkGasAndProcess(); // Run immediately on start
}

startMonitoring();