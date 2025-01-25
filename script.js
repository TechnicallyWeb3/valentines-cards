// Development bypass - set to true to show valentine creation form regardless of date
const DEV_MODE = true;  // Set this to false for production

// Add at the top with other globals
let walletConnected = false;

function sendValentine() {
    const recipient = document.getElementById('recipientAddress').value;
    const customMessageEnabled = document.getElementById('customMessage').checked;
    const message = customMessageEnabled 
        ? document.getElementById('valentineMessage').value 
        : "Happy Valentine's Day! 💝"; // Default message

    if (recipient.trim() === '') {
        alert('Please enter recipient Polygon address!');
        return;
    }

    if (customMessageEnabled && message.trim() === '') {
        alert('Please enter your message!');
        return;
    }

    const sentMessage = document.getElementById('sentMessage');
    sentMessage.innerHTML = `
        <h3>💌 Valentine Sent!</h3>
        <p>Dear ${recipient},</p>
        <p>${message}</p>
        <p>With love ❤️</p>
    `;
    sentMessage.style.display = 'block';

    // Clear the form
    document.getElementById('recipientAddress').value = '';
    if (customMessageEnabled) {
        document.getElementById('valentineMessage').value = '';
    }
}

// Update the wallet connection handler
document.getElementById('connectWallet').addEventListener('click', async () => {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            
            // Update connection state
            walletConnected = true;
            updateSendButton(); // Update send button state
            
            // Update button text while maintaining responsive structure
            const button = document.getElementById('connectWallet');
            button.innerHTML = `
                👛 <span class="wallet-text-long">${account.slice(0, 6)}...${account.slice(-4)}</span>
                <span class="wallet-text-medium">${account.slice(0, 6)}...</span>
            `;
            button.style.backgroundColor = '#e0ffe0';
            
        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Error connecting wallet. Please try again.');
        }
    } else {
        alert('Please install MetaMask or another Web3 wallet to connect!');
    }
});

// Add new function to update send button
function updateSendButton() {
    const sendButton = document.querySelector('.valentine-card button');
    if (!walletConnected) {
        sendButton.textContent = 'Connect Wallet to Send';
        sendButton.onclick = connectWallet;
    } else {
        sendButton.textContent = 'Send Love ❤️';
        sendButton.onclick = sendValentine;
    }
}

// Extract connect wallet logic to reuse
async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            walletConnected = true;
            updateSendButton();
            
            // Update header wallet button
            const button = document.getElementById('connectWallet');
            button.innerHTML = `
                👛 <span class="wallet-text-long">${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}</span>
                <span class="wallet-text-medium">${accounts[0].slice(0, 6)}...</span>
            `;
            button.style.backgroundColor = '#e0ffe0';
            
            // Load valentines after successful connection
            loadValentines();
        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Error connecting wallet. Please try again.');
        }
    } else {
        alert('Please install MetaMask or another Web3 wallet to connect!');
    }
}

// Add disconnect handler (for testing)
function disconnectWallet() {
    walletConnected = false;
    updateSendButton();
    loadValentines(); // This will hide the section
    
    // Reset wallet button
    const button = document.getElementById('connectWallet');
    button.innerHTML = `👛 <span class="wallet-text-long">Connect Wallet</span>`;
    button.style.backgroundColor = 'white';
}

// Update the valentine card HTML to remove the onclick
function updateValentineCardButton() {
    const valentineCard = document.querySelector('.valentine-card');
    if (valentineCard) {
        const buttonHtml = `<button>Connect Wallet to Send</button>`;
        // Find and replace the existing button
        const existingButton = valentineCard.querySelector('button');
        if (existingButton) {
            existingButton.outerHTML = buttonHtml;
        }
        updateSendButton();
    }
}

// Call this when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadValentines();
    updateValentineCardButton();
});

function getCurrentUTCDate() {
    if (DEV_MODE) {
        // In dev mode, simulate Valentine's Day by setting the date to Feb 14
        const now = new Date();
        return new Date(Date.UTC(
            now.getUTCFullYear(),
            1,  // February (0-based)
            14, // Valentine's Day
            now.getUTCHours(),
            now.getUTCMinutes(),
            now.getUTCSeconds()
        ));
    }
    return new Date();
}

function updateCountdown() {
    const now = getCurrentUTCDate();
    const currentYear = now.getUTCFullYear();
    const isValentinesDay = now.getUTCMonth() === 1 && now.getUTCDate() === 14;
    
    const countdownContainer = document.getElementById('countdown-container');
    const valentineCard = document.querySelector('.valentine-card');
    const valentinesBanner = document.getElementById('valentines-banner');
    const walletButton = document.getElementById('connectWallet');
    let targetDate;
    
    // Check if we need to update the countdown label
    const existingLabel = countdownContainer.querySelector('.countdown-label');
    
    if (isValentinesDay) {
        // Show Valentine's banner, minting form, and wallet button
        valentinesBanner.style.display = 'block';
        valentineCard.style.display = 'block';
        walletButton.classList.add('visible');
        
        // Count down to end of Valentine's Day
        targetDate = new Date(Date.UTC(currentYear, 1, 15)); // Next day at midnight
        countdownContainer.classList.add('minting-open');
        
        // Only add the label if it doesn't exist
        if (!existingLabel) {
            const countdownLabel = document.createElement('div');
            countdownLabel.className = 'countdown-label';
            countdownLabel.textContent = 'Minting closes in:';
            countdownContainer.insertBefore(countdownLabel, document.querySelector('.countdown'));
        }
    } else {
        // Hide Valentine's banner, minting form, and wallet button
        valentinesBanner.style.display = 'none';
        valentineCard.style.display = 'none';
        walletButton.classList.remove('visible');
        
        // Remove the label if it exists
        if (existingLabel) {
            existingLabel.remove();
        }
        
        // Count down to next Valentine's Day
        targetDate = new Date(Date.UTC(currentYear, 1, 14));
        if (now > targetDate) {
            targetDate = new Date(Date.UTC(currentYear + 1, 1, 14));
        }
        countdownContainer.classList.remove('minting-open');
    }
    
    const difference = targetDate - now;
    
    // Update the countdown numbers
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    document.getElementById('days').textContent = days.toString().padStart(2, '0');
    document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');

    updateInstructions();
}

// Update countdown immediately and then every second
updateCountdown();
setInterval(updateCountdown, 1000);

// Add this after your existing code
document.getElementById('customMessage').addEventListener('change', function() {
    const messageArea = document.getElementById('valentineMessage');
    messageArea.style.display = this.checked ? 'block' : 'none';
});

function updateInstructions() {
    const now = getCurrentUTCDate();
    const isValentinesDay = now.getUTCMonth() === 1 && now.getUTCDate() === 14;
    
    const instructionsContent = document.getElementById('instructions-content');
    
    if (isValentinesDay) {
        instructionsContent.innerHTML = `
            <ul>
                <li><span class="highlight">Minting is OPEN!</span> Valentine's NFTs are available until the end of the countdown!</li>
                <li>Connect your wallet using the button in the top right</li>
                <li>Enter your valentine's Polygon wallet address</li>
                <li>Choose between a random Valentine's NFT or add your custom message</li>
                <li>Mint your unique Valentine's NFT directly to their wallet</li>
                <li>Each NFT is unique and will be randomly selected from our collection</li>
            </ul>
        `;
    } else {
        instructionsContent.innerHTML = `
            <ul>
                <li><span class="highlight">Minting is currently CLOSED</span></li>
                <li>Valentine's NFTs can only be minted on February 14th (UTC)</li>
                <li>Mark your calendar and don't forget to come back on Valentine's Day!</li>
                <li>Each NFT is unique and will be randomly selected from our collection</li>
                <li>You'll be able to mint directly to your valentine's Polygon wallet address</li>
                <li>Check the countdown above for exact timing</li>
            </ul>
        `;
    }
}

// Initial call
updateInstructions();

// Add modal functionality
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('valentineModal');
    const modalImage = modal.querySelector('.modal-image');
    const modalSender = modal.querySelector('.sender');
    const modalYear = modal.querySelector('.year');
    const modalMessage = modal.querySelector('.message');
    
    // Add click handlers to all valentine cards
    document.querySelectorAll('.received-valentine').forEach(card => {
        card.addEventListener('click', function() {
            const thumbnail = this.querySelector('.nft-image');
            const sender = this.querySelector('.sender').textContent;
            const year = this.querySelector('.year').textContent;
            const message = this.querySelector('.message').textContent;
            
            modalImage.src = thumbnail.src;
            modalSender.textContent = sender;
            modalYear.textContent = year;
            modalMessage.textContent = message;
            
            modal.style.display = 'flex';
        });
    });
    
    // Close modal when clicking the close button
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Close modal with escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            modal.style.display = 'none';
        }
    });
});

// Mock NFT data
const mockValentines = [
    // {
    //     id: 1,
    //     image: "https://placehold.co/400x400/ffd6e6/ff4d79?text=Valentine+NFT+1",
    //     sender: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    //     year: "Valentine's Day 2024",
    //     message: "To my blockchain sweetheart! Happy Valentine's Day! 💝"
    // },
    // {
    //     id: 2,
    //     image: "https://placehold.co/400x400/ffd6e6/ff4d79?text=Valentine+NFT+2",
    //     sender: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    //     year: "Valentine's Day 2024",
    //     message: "Roses are red, violets are blue, blockchain is sweet, and so are you! 💖"
    // },
    // {
    //     id: 3,
    //     image: "https://placehold.co/400x400/ffd6e6/ff4d79?text=Valentine+NFT+3",
    //     sender: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    //     year: "Valentine's Day 2023",
    //     message: "Last year's olove still on the chain! 💗"
    // }
];

// Function to format address for display
function formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Function to create valentine card HTML
function createValentineCard(valentine) {
    return `
        <div class="received-valentine">
            <div class="valentine-thumbnail">
                <img src="${valentine.image}" alt="Valentine NFT" class="nft-image">
            </div>
            <div class="valentine-info">
                <p class="sender">From: <a href="https://polygonscan.com/address/${valentine.sender}" 
                    target="_blank" class="address-link">${formatAddress(valentine.sender)}</a></p>
                <p class="year">${valentine.year}</p>
                <p class="message">"${valentine.message}"</p>
            </div>
        </div>
    `;
}

// Function to load and display valentines
function loadValentines() {
    const receivedSection = document.querySelector('.received-valentines');
    const valentinesGrid = document.querySelector('.valentines-grid');
    
    if (!walletConnected) {
        receivedSection.style.display = 'none';
        return;
    }
    
    receivedSection.style.display = 'block';
    
    // Clear existing content
    valentinesGrid.innerHTML = '';
    
    // Add loading state
    valentinesGrid.innerHTML = '<div class="loading">Loading your valentines... 💝</div>';
    
    // Simulate API delay
    setTimeout(() => {
        // Clear loading state
        valentinesGrid.innerHTML = '';
        
        if (mockValentines.length === 0) {
            valentinesGrid.innerHTML = `
                <div class="no-valentines">
                    <p class="heartbeat">💝 Don't worry, we love you! 💝</p>
                    <p class="sub-text">
                        <a href="#create-valentine" class="love-link">Spread the love - send a valentine to someone special!</a>
                    </p>
                </div>
            `;
            return;
        }
        
        // Add mock valentines
        mockValentines.forEach(valentine => {
            valentinesGrid.innerHTML += createValentineCard(valentine);
        });
        
        // Reinitialize modal handlers
        initializeModalHandlers();
    }, 1500);
}

// Function to initialize modal handlers
function initializeModalHandlers() {
    const modal = document.getElementById('valentineModal');
    const modalImage = modal.querySelector('.modal-image');
    const modalSender = modal.querySelector('.sender');
    const modalYear = modal.querySelector('.year');
    const modalMessage = modal.querySelector('.message');
    
    document.querySelectorAll('.received-valentine').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.classList.contains('address-link')) {
                return;
            }
            
            const thumbnail = this.querySelector('.nft-image');
            const sender = this.querySelector('.address-link');
            const year = this.querySelector('.year').textContent;
            const message = this.querySelector('.message').textContent;
            
            modalImage.src = thumbnail.src;
            modalSender.innerHTML = `From: ${sender.outerHTML}`;
            modalYear.textContent = year;
            modalMessage.textContent = message;
            
            modal.style.display = 'flex';
        });
    });
}

// Add loading style