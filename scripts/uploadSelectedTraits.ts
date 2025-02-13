import { ethers } from 'ethers';
import hre from 'hardhat';
import { traits } from '../artwork/valentines.svg';

// Contract addresses
const DPR_ADDRESS = '0x9885FF0546C921EFb19b1C8a2E10777A9dAc8e88';
const VALENTINE_NFT_ADDRESS = '0xf5F4A8e3C1e11623D83a23E50039407F11dCD656'; // Polygon

async function uploadSelectedTraits(traitIndices: number[]) {
    // Initialize contracts
    const [signer] = await hre.ethers.getSigners();
    const dpr = await hre.ethers.getContractAt('DataPointRegistry', DPR_ADDRESS, signer);
    const valentine = await hre.ethers.getContractAt('ValentineNFT', VALENTINE_NFT_ADDRESS, signer);

    // Process each category
    for (let categoryId = 1; categoryId < traitIndices.length; categoryId++) {
        const selectedIndex = traitIndices[categoryId];
        const category = Object.values(traits)[categoryId];
        if (!category || selectedIndex >= category.traits.length) {
            console.log(`Invalid index ${selectedIndex} for category ${categoryId}`);
            continue;
        }

        const trait = category.traits[selectedIndex];
        console.log(`Processing ${categoryId} - ${trait.name}`);

        // Prepare data point request
        const request = {
            data: trait.svg,
            mimeType: "0x6973",
            charset: "0x7508",
            location: "0x0101"
        };

        // Calculate data point address and get royalty
        const data = ethers.toUtf8Bytes(request.data);
        const packed = ethers.concat([
            ethers.getBytes(request.mimeType),
            ethers.getBytes(request.charset),
            ethers.getBytes(request.location),
            data
        ]);
        const dataPointAddress = ethers.keccak256(packed);
        console.log(`Data point address: ${dataPointAddress}`);
        const royalty = await dpr.getRoyalty(dataPointAddress);

        // if (royalty === 0n) {
            // Upload trait
            console.log(`Setting SVG layer for ${category.id} with royalty: ${royalty}`);
            const tx = await valentine.setSVGLayer(
                category.id,
                trait.name,
                trait.svg,
                {
                    value: royalty
                }
            );
            await tx.wait();
            console.log(`Successfully uploaded ${category.id} - ${trait.name}`);
        // } else {
        //     console.log(`Trait ${category.id} - ${trait.name} already uploaded`);
        // }
    }
}

// Example usage:
const selectedTraits = [
    13,  // First background trait
    23,  // Second body trait
    14,  // First eyes trait
    // Add other indices as needed
];

uploadSelectedTraits(selectedTraits)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 