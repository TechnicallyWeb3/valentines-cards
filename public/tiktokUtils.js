import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { RPC_URL, loadContractABI } from './contractConfig.js';

export const TIKTOKEN_ADDRESS = "0x359c3AD611e377e050621Fb3de1C2f4411684E92";

// Get basic TikTok user data
export async function getTikTokData(handle) {
    try {
        const url = `https://livecounts.io/tiktok-live-follower-counter/${handle}`;
        
        // Add headers that might help with CORS
        const headers = {
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Origin': window.location.origin,
            'Referer': window.location.origin,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };

        console.log("Attempting fetch with headers:", headers);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            mode: 'cors',  // Try with explicit CORS mode
            credentials: 'omit'  // Don't send cookies
        });

        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers);

        const html = await response.text();
        console.log("Response body:", html);

        return {
            success: false,
            message: "Testing with headers"
        };
    } catch (error) {
        console.error("Error fetching TikTok data:", error);
        return {
            success: false,
            message: "Error fetching TikTok data"
        };
    }
}

// Get blockchain address for a TikTok userId
export async function getTikTokAddress(userId) {
    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const abi = await loadContractABI();
        const contract = new ethers.Contract(
            TIKTOKEN_ADDRESS,
            abi,
            provider
        );

        const address = await contract.getUserAccount(userId);

        if (address === "0x0000000000000000000000000000000000000000") {
            return {
                address: null,
                success: true,
                message: "This TikTok user has not registered for TikToken"
            };
        }

        return {
            address,
            success: true,
            message: "Address found!"
        };

    } catch (error) {
        console.error("Error fetching blockchain data:", error);
        return {
            address: null,
            success: false,
            message: "Error fetching blockchain data"
        };
    }
}

// Combined function to get both TikTok data and address
export async function getTikTokUser(handle) {
    const userData = await getTikTokData(handle);
    if (!userData.success) {
        return userData; // Return error if TikTok fetch failed
    }

    const addressData = await getTikTokAddress(userData.userId);
    if (!addressData.success) {
        return addressData; // Return error if blockchain fetch failed
    }

    // Combine the data
    return {
        ...userData,
        address: addressData.address,
        message: addressData.message,
        success: true
    };
}

// Add to global config when document loads
document.addEventListener('DOMContentLoaded', () => {
    window.contractConfig = window.contractConfig || {};
    window.contractConfig.getTikTokData = getTikTokData;
    window.contractConfig.getTikTokAddress = getTikTokAddress;
    window.contractConfig.getTikTokUser = getTikTokUser;
}); 