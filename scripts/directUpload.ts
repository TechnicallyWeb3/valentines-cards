import { ethers } from "hardhat";
import hre from "hardhat";
import { traits } from "../artwork/valentines.svg";

// Contract addresses
const DPR_ADDRESS = '0x9885FF0546C921EFb19b1C8a2E10777A9dAc8e88';
const VALENTINE_NFT_ADDRESS = '0x2F2DAa6af903B01F6F87011242386F686bc61ce1';

async function uploadDataPoint(svg: string) {
    const [signer] = await hre.ethers.getSigners();
    const dpr = await hre.ethers.getContractAt('DataPointRegistry', DPR_ADDRESS, signer);

    // Prepare data point request
    const request = {
        data: svg,
        mimeType: "0x6973",
        charset: "0x7508",
        location: "0x0101"
    };

    // Calculate data point address
    const data = ethers.toUtf8Bytes(request.data);
    const packed = ethers.concat([
        ethers.getBytes(request.mimeType),
        ethers.getBytes(request.charset),
        ethers.getBytes(request.location),
        data
    ]);
    const dataPointAddress = ethers.keccak256(packed);

    // Create DataPoint structure
    const dataPoint = {
        structure: {
            mimeType: "0x6973",
            charset: "0x7508",
            location: "0x0101"
        },
        data: ethers.toUtf8Bytes(svg)
    };

    // Get current gas price and increase it slightly
    const gasPrice = await hre.ethers.provider.getFeeData();
    const increasedMaxFeePerGas = gasPrice.maxFeePerGas! * 150n / 100n; // Increase by 20%
    const increasedPriorityFee = gasPrice.maxPriorityFeePerGas! * 151n / 100n; // Increase by 20%
    
    console.log("Current gas price:", ethers.formatUnits(gasPrice.gasPrice || 0, "gwei"), "Gwei");
    console.log("Using increased maxFeePerGas:", ethers.formatUnits(increasedMaxFeePerGas, "gwei"), "Gwei");

    // Write to DPR using signer as publisher
    console.log("Writing data point...");
    try {
        const tx = await dpr.writeDataPoint(
            dataPoint,
            signer.address,
            {
                gasLimit: 30000000, // Maximum block gas limit on Polygon
                maxFeePerGas: increasedMaxFeePerGas,
                maxPriorityFeePerGas: increasedPriorityFee,
            }
        );

        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Transaction confirmed in block:", receipt?.blockNumber);
        console.log("Gas used:", receipt?.gasUsed.toString());
        
        return dataPointAddress;
    } catch (error: any) {
        // Try to get more detailed error information
        if (error.data) {
            console.error("Detailed error data:", error.data);
        }
        
        if (error.message.includes("gas") || error.message.includes("revert")) {
            console.log("SVG size in bytes:", ethers.toUtf8Bytes(svg).length);
            console.error("Full error:", error);
            throw new Error(`Gas estimation failed. SVG might be too large. Size: ${ethers.toUtf8Bytes(svg).length} bytes`);
        }
        
        throw error;
    }
}

async function main() {
    // Find the Valentine Punk trait
    const illustration = traits.illustrations.traits.find(t => t.name === "Valentine Punk");
    
    if (!illustration) {
        throw new Error("Valentine Punk trait not found");
    }

    console.log("Uploading Valentine Punk illustration...");
    const dataPointAddress = await uploadDataPoint(illustration.svg);
    console.log("Data point address:", dataPointAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 