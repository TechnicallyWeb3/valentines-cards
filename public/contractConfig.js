import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
// Initialize the global config object immediately
window.contractConfig = {};

// Constants
const CONTRACT_ADDRESS = '0x372D61a4B4A5F7C5B133F628F99879E02c9BaCCD';
const NETWORK_ID = '11155111'; // Sepolia testnet
const RPC_URL = 'https://ethereum-sepolia.publicnode.com';
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
    if (typeof window.ethereum === 'undefined') {
        console.error('Web3 provider not found');
        return null;
    }

    const abi = await loadContractABI();
    if (!abi) return null;

    // Updated for ethers v6
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    return new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
}

// Get Valentine's date from contract
export async function getValentineDate() {
    console.log('Getting Valentine date...');
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
async function getValentineMetadata(tokenId) {
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
        if (balance === 0) return [];

        // Calculate end index
        const actualEndIndex = endIndex || Math.min(startIndex + MAX_FETCH_SIZE, balance);
        
        // Fetch tokens in range
        const fetchPromises = [];
        for (let i = startIndex; i < actualEndIndex; i++) {
            const tokenId = await getTokenByIndex(address, i);
            if (tokenId !== null) {
                fetchPromises.push(getValentineMetadata(tokenId));
            }
        }

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

// Add cookie helper functions
function setCookie(name, value, days = 7) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=');
        return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, '');
}

// Get stored minted tokens
export function getMintedTokens() {
    const tokens = getCookie('mintedTokens');
    return tokens ? JSON.parse(tokens) : [];
}

// Mint a single valentine
export async function mintValentine(to, message = "") {
    if (!window.ethereum) {
        throw new Error("MetaMask not installed");
    }

    try {
        // Get contract with MetaMask provider
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const abi = await loadContractABI();
        if (!abi) throw new Error("Failed to load contract ABI");
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
        const prices = await getMintPrices();
        
        // Calculate total price based on whether there's a message
        const totalPrice = ethers.parseEther(
            message ? 
            (Number(prices.card) + Number(prices.message)).toString() : 
            prices.card
        );

        // Validate message length if provided
        if (message && message.length > 280) {
            throw new Error("Message too long - maximum 280 characters");
        }

        // Choose appropriate mint function based on whether there's a message
        let tx;
        if (message) {
            const valentine = {
                to: to,
                from: ethers.ZeroAddress,
                message: message
            };
            tx = await contract.bulkMint([valentine], { value: totalPrice });
        } else {
            tx = await contract.mint(to, { value: totalPrice });
        }

        console.log("Transaction sent:", tx.hash);
        
        // Wait for transaction receipt
        const receipt = await tx.wait();
        
        // Find ValentineMinted event in the logs
        const valentineMintedEvent = receipt.logs
            .map(log => {
                try {
                    return contract.interface.parseLog(log);
                } catch (e) {
                    return null;
                }
            })
            .find(event => event && event.name === 'ValentineMinted');

        if (valentineMintedEvent) {
            const tokenId = valentineMintedEvent.args.tokenId;
            console.log("Minted token ID:", tokenId);
            
            // Store the minted token in cookies
            const mintedTokens = getMintedTokens();
            mintedTokens.push({
                tokenId: tokenId.toString(),
                to: to,
                message: message || "",
                timestamp: Date.now()
            });
            setCookie('mintedTokens', JSON.stringify(mintedTokens));
            
            return {
                success: true,
                tokenId: tokenId.toString(),
                transaction: tx.hash,
                receipt: receipt
            };
        }

        throw new Error("Failed to find minted token ID in transaction logs");

    } catch (error) {
        console.error('Error minting valentine:', error);
        throw error;
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
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

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

        // Store the minted tokens in cookies
        const existingTokens = getMintedTokens();
        const updatedTokens = [...existingTokens, ...mintedTokens];
        setCookie('mintedTokens', JSON.stringify(updatedTokens));

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

// Initialize the contract config
document.addEventListener('DOMContentLoaded', () => {
    // Assign all functions to the global config object
    Object.assign(window.contractConfig, {
        CONTRACT_ADDRESS,
        NETWORK_ID,
        RPC_URL,
        getValentineDate,
        initializeContract,
        loadContractABI,
        getBalance,
        getTokenByIndex,
        fetchValentines,
        getMintPrices,
        mintValentine,
        batchMintValentines
    });
    
    console.log('Contract config initialized');
}); 