import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

// Constants
export const VALENTINE_ADDRESS = '0xf5F4A8e3C1e11623D83a23E50039407F11dCD656';
// const NETWORK_NAME = 'Polygon';
// const NETWORK_SYMBOL = 'POL';
// const NETWORK_ID = '137';
// const RPC_URL = 'https://polygon-bor-rpc.publicnode.com';
// const NETWORK_EXPLORER_URL = 'https://polygonscan.com';

const NETWORK_NAME = 'Sepolia';
const NETWORK_SYMBOL = 'S.ETH';
const NETWORK_ID = '11155111';
const RPC_URL = 'https://ethereum-sepolia.publicnode.com';
const NETWORK_EXPLORER_URL = 'https://sepolia.etherscan.io';
export const NETWORK_DETAILS = {
    chainId: NETWORK_ID,
    chainName: NETWORK_NAME,
    nativeCurrency: {
        name: NETWORK_NAME,
        symbol: NETWORK_SYMBOL,
        decimals: 18
    },
    rpcUrls: [RPC_URL],
    blockExplorerUrls: [NETWORK_EXPLORER_URL]
};

const MAX_FETCH_SIZE = 12;

// Load contract ABI
export async function loadContractABI() {
    try {
        const response = await fetch('./contracts/ValentineNFT.json');
        const data = await response.json();
        return data.abi;
    } catch (error) {
        console.error('Error loading contract ABI:', error);
        return null;
    }
}

// Initialize contract
export async function initializeContract() {
    // if (typeof window.ethereum === 'undefined') {
    //     console.error('Web3 provider not found');
    //     return null;
    // }

    const abi = await loadContractABI();

    if (!abi) return null;

    // Updated for ethers v6
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    return new ethers.Contract(VALENTINE_ADDRESS, abi, provider);
}

// Get Valentine's date from contract
export async function getValentineDate() {
    // console.log('Getting Valentine date...');
    const contract = await initializeContract();
    if (!contract) return { month: 2, day: 14 }; // Default fallback

    try {
        const date = await contract.valentineDate();
        // console.log('Valentine date:', date);
        return {
            month: Number(date[0]), // Convert BigInt to Number
            day: Number(date[1])    // Convert BigInt to Number
        };
    } catch (error) {
        console.error('Error getting Valentine date:', error);
        return { month: 2, day: 14 }; // Fallback on error
    }
}

// Get balance of address
export async function getBalance(address) {
    const contract = await initializeContract();
    if (!contract) return 0;

    try {
        const balance = await contract.balanceOf(address);
        return Number(balance);
    } catch (error) {
        console.error('Error getting balance:', error);
        return 0;
    }
}

// Get token by index
export async function getTokenByIndex(address, index) {
    const contract = await initializeContract();
    if (!contract) return null;

    try {
        const tokenId = await contract.tokenOfOwnerByIndex(address, index);
        return Number(tokenId);
    } catch (error) {
        console.error('Error getting token by index:', error);
        return null;
    }
}

// Get valentine metadata
export async function getValentineMetadata(tokenId) {
    const contract = await initializeContract();
    if (!contract) return null;

    try {
        const tokenURI = await contract.tokenURI(tokenId);
        const base64Data = tokenURI.split(',')[1];
        const decodedData = JSON.parse(atob(base64Data));
        
        // Find specific attributes in the array
        const findAttribute = (traitType) => {
            const attr = decodedData.attributes.find(a => a.trait_type === traitType);
            return attr ? attr.value : null;
        };

        // Extract specific traits
        const year = findAttribute("Mint Year");
        const sender = findAttribute("Sender");
        const message = findAttribute("Message");

        return {
            id: tokenId,
            image: decodedData.image,
            sender: sender || "0xd95ad26E9e39107B432329bD6bEfB720f1fBb3dD",
            year: `Valentine's Day ${year}`,
            message: message || "" // Fallback to empty string if no message
        };
    } catch (error) {
        console.error('Error getting valentine metadata:', error);
        return null;
    }
}

// Fetch valentines for an address
export async function fetchValentines(address, startIndex = 0, endIndex = null) {
    if (!address) return [];
    
    try {
        const balance = await getBalance(address);
        console.log("BALANCE: ", balance);
        if (balance === 0) return [];

        // Calculate end index based on remaining tokens
        const remainingTokens = balance - startIndex;
        const maxFetchSize = Math.min(MAX_FETCH_SIZE, remainingTokens);
        const actualEndIndex = endIndex ? 
            Math.min(endIndex - startIndex, maxFetchSize) + startIndex : 
            startIndex + maxFetchSize;

        console.log("ACTUAL END INDEX: ", actualEndIndex);
        
        // Fetch tokens in range
        const fetchPromises = [];
        for (let i = startIndex; i < actualEndIndex; i++) {
            const tokenId = await getTokenByIndex(address, i);
            if (tokenId !== null) {
                console.log("TOKEN ID: ", tokenId);
                fetchPromises.push(getValentineMetadata(tokenId));
                await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
            }
        }
        // console.log("FETCH PROMISES: ", fetchPromises);
        // Wait for all metadata to be fetched
        const valentines = await Promise.all(fetchPromises);
        return valentines.filter(v => v !== null);

    } catch (error) {
        console.error('Error fetching valentines:', error);
        return [];
    }
}

// Get mint prices from contract
export async function getMintPrices() {
    const contract = await initializeContract();
    if (!contract) return { card: "0.001", message: "0.005" }; // Default fallback

    try {
        const price = await contract.mintPrice();
        // console.log(price);
        return {
            card: ethers.formatEther(price.card),    // Convert from wei to ETH
            message: ethers.formatEther(price.message)
        };
    } catch (error) {
        console.error('Error getting mint prices:', error);
        return { card: "0.001", message: "0.005" }; // Fallback on error
    }
}

// Batch mint multiple valentines
export async function batchMintValentines(valentines) {
    if (!window.ethereum) {
        throw new Error("MetaMask not installed");
    }

    try {
        // Get contract with MetaMask provider
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const abi = await loadContractABI();
        if (!abi) throw new Error("Failed to load contract ABI");
        
        const contract = new ethers.Contract(VALENTINE_ADDRESS, abi, signer);

        // Validate batch size
        if (valentines.length > 100) {
            throw new Error("Batch too large - maximum 100 valentines");
        }

        // Validate message lengths
        for (const valentine of valentines) {
            if (valentine.message && valentine.message.length > 280) {
                throw new Error("Message too long - maximum 280 characters");
            }
        }

        const prices = await getMintPrices();

        // Calculate total price for batch
        const totalPrice = ethers.parseEther(
            valentines.reduce((sum, v) => 
                sum + Number(prices.card) + (v.message ? Number(prices.message) : 0)
            , 0).toString()
        );

        // Format valentines for contract
        const formattedValentines = valentines.map(v => ({
            to: v.to,
            from: ethers.ZeroAddress,
            message: v.message || ""
        }));

        const tx = await contract.bulkMint(formattedValentines, { value: totalPrice });
        console.log("Transaction sent:", tx.hash);
        
        // Wait for transaction receipt
        const receipt = await tx.wait();
        
        // Find ValentineMinted events in the logs
        const mintedTokens = receipt.logs
            .map(log => {
                try {
                    return contract.interface.parseLog(log);
                } catch (e) {
                    return null;
                }
            })
            .filter(event => event && event.name === 'ValentineMinted')
            .map(event => ({
                tokenId: event.args.tokenId.toString(),
                to: event.args.to,
                timestamp: Date.now()
            }));

        return {
            success: true,
            mintedTokens: mintedTokens,
            transaction: tx.hash,
            receipt: receipt
        };

    } catch (error) {
        console.error('Error batch minting valentines:', error);
        throw error;
    }
}

// Helper function to get signer
async function getSigner() {
    if (!window.ethereum) return null;
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    return await provider.getSigner();
}

export async function addMessageToToken(tokenId, message) {
    if (!window.ethereum) {
        throw new Error("MetaMask not installed");
    }

    try {
        const contract = await initializeContract();
        if (!contract) throw new Error("Failed to initialize contract");

        // Get current signer's address
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();

        // Get token metadata to check sender and existing message
        const tokenURI = await contract.tokenURI(tokenId);
        const base64Data = tokenURI.split(',')[1];
        const decodedData = JSON.parse(atob(base64Data));
        
        // Find sender and message in attributes
        const findAttribute = (traitType) => {
            const attr = decodedData.attributes.find(a => a.trait_type === traitType);
            return attr ? attr.value : null;
        };

        const tokenSender = findAttribute("Sender");
        const existingMessage = findAttribute("Message");

        // Perform prechecks
        if (tokenSender.toLowerCase() !== signerAddress.toLowerCase()) {
            throw new Error("Only the original sender can add a message");
        }

        if (existingMessage) {
            throw new Error("Token already has a message");
        }

        if (message.length > 280) {
            throw new Error("Message too long - maximum 280 characters");
        }

        // Get message price
        const prices = await getMintPrices();
        const messagePrice = ethers.parseEther(prices.message);

        // Get contract with signer
        const contractWithSigner = new ethers.Contract(
            VALENTINE_ADDRESS, 
            await loadContractABI(), 
            signer
        );

        // Send transaction
        const tx = await contractWithSigner.addMessage(tokenId, message, {
            value: messagePrice
        });

        const receipt = await tx.wait();
        
        return {
            success: true,
            transaction: tx.hash,
            receipt: receipt
        };

    } catch (error) {
        console.error('Error adding message:', error);
        throw error;
    }
}

