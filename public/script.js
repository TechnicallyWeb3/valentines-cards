import { getValentineDate, fetchValentines, getMintPrices, mintValentine, batchMintValentines } from './contractConfig.js';

// Development bypass - set to true to show valentine creation form regardless of date
const DEV_MODE = true;  // Set this to false for production

// Add at the top with other globals
let walletConnected = false;
let valentineDate = { month: 2, day: 14 }; // Default until loaded
let isLoading = false;
let currentIndex = 0;
const BATCH_SIZE = 12;
let observer; // Add this global variable to store the observer
let currentSlide = 0;
const profiles = [
    {
        name: "Vitalik Buterin",
        image: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Vitalik_Buterin_TechCrunch_London_2015_%28cropped%29.jpg",
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    },
    {
        name: "Satoshi Nakamoto",
        image: "path/to/satoshi.jpg",
        address: "0x0000000000000000000000000000000000000000"
    },
    {
        name: "Vitalik Buterin",
        image: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Vitalik_Buterin_TechCrunch_London_2015_%28cropped%29.jpg",
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    },
    {
        name: "Satoshi Nakamoto",
        image: "path/to/satoshi.jpg",
        address: "0x0000000000000000000000000000000000000000"
    },
    {
        name: "Vitalik Buterin",
        image: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Vitalik_Buterin_TechCrunch_London_2015_%28cropped%29.jpg",
        address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    },
    {
        name: "Satoshi Nakamoto",
        image: "path/to/satoshi.jpg",
        address: "0x0000000000000000000000000000000000000000"
    },
    // Add more profiles as needed
];


async function sendValentine() {
    const recipient = document.getElementById('recipientAddress').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const customMessageEnabled = document.getElementById('customMessage').checked;
    const message = customMessageEnabled 
        ? document.getElementById('valentineMessage').value 
        : ""; // Default message

    // Input validation
    if (recipient.trim() === '') {
        alert('Please enter recipient Polygon address!');
        return;
    }

    if (customMessageEnabled && message.trim() === '') {
        alert('Please enter your message!');
        return;
    }
    if (quantity < 1 || quantity > 100) {
        alert('Please enter a quantity between 1 and 100!');
        return;
    }

    const sentMessage = document.getElementById('sentMessage');
    sentMessage.innerHTML = '<div class="valentine-sending">💌 Sending your valentine(s)...</div>';
    sentMessage.style.display = 'block';

    try {
        console.log("QUANTITY: ", quantity);
        if (!(quantity > 1)) {
            // Single mint
            const result = await mintValentine(recipient, message);
            
            sentMessage.innerHTML = `
                <div class="valentine-sent">
                    <h3>💌 Valentine Sent!</h3>
                    <p>To: ${recipient}</p>
                    ${message ? `<p>Message: ${message}</p>` : `<button onclick="addMessage(${result.tokenId})" class="add-message-btn">Add Message</button>`}
                    <p>Token ID: ${result.tokenId}</p>
                    <p>Transaction: <a href="https://polygonscan.com/tx/${result.transaction}" 
                        target="_blank">${result.transaction.slice(0, 6)}...${result.transaction.slice(-4)}</a></p>
                    ${result.isMock ? '<p class="mock-notice">(Test Mode)</p>' : ''}
                    <p>With love ❤️</p>
                </div>
            `;
        } else {
            // Batch mint
            const valentines = Array(quantity).fill().map(() => ({
                to: recipient,
                message: message
            }));
            
            const result = await batchMintValentines(valentines);
            
            let valentinesHtml = '';
            result.mintedTokens.forEach(token => {
                valentinesHtml += `
                    <div class="valentine-sent">
                        <h3>💌 Valentine Sent!</h3>
                        <p>To: ${recipient}</p>
                        ${message ? `<p>Message: ${message}</p>` : ''}
                        <p>Token ID: ${token.tokenId}</p>
                        ${result.isMock ? '<p class="mock-notice">(Test Mode)</p>' : ''}
                        <p>With love ❤️</p>
                    </div>
                `;
            });
            
            sentMessage.innerHTML = `
                <div class="batch-transaction">
                    <p>Transaction: <a href="https://polygonscan.com/tx/${result.transaction}" 
                        target="_blank">${result.transaction.slice(0, 6)}...${result.transaction.slice(-4)}</a></p>
                </div>
                ${valentinesHtml}
            `;
        }
    } catch (error) {
        console.error('Error sending valentine:', error);
        sentMessage.innerHTML = `
            <div class="valentine-error">
                <h3>❌ Error Sending Valentine</h3>
                <p>${error.message || 'Transaction failed. Please try again.'}</p>
            </div>
        `;
        return;
    }

    // Clear the form
    document.getElementById('recipientAddress').value = '';
    document.getElementById('quantity').value = '1';
    if (customMessageEnabled) {
        document.getElementById('valentineMessage').value = '';
    }
}

// function connectWallet() {
//     if (typeof window.ethereum !== 'undefined') {
//         try {
//             const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
//             const account = accounts[0];
            
//             // Update connection state
//             walletConnected = true;
//             updateSendButton(); // Update send button state
            
//             // Update button text while maintaining responsive structure
//             const button = document.getElementById('connectWallet');
//             button.innerHTML = `
//                 👛 <span class="wallet-text-long">${account.slice(0, 6)}...${account.slice(-4)}</span>
//                 <span class="wallet-text-medium">${account.slice(0, 6)}...</span>
//             `;
//             button.style.backgroundColor = '#e0ffe0';
            
//         } catch (error) {
//             console.error('Error connecting wallet:', error);
//             alert('Error connecting wallet. Please try again.');
//         }
//     } else {
//         alert('Please install MetaMask or another Web3 wallet to connect!');
//     }
// }

// Update the wallet connection handler
document.getElementById('connectWallet').addEventListener('click', async () => {
    await connectWallet();
});

// Add new function to update send button
async function updateSendButton() {
    const sendButton = document.querySelector('.valentine-card button');
    if (!walletConnected) {
        const prices = await getMintPrices();
        const qty = parseInt(document.getElementById('quantity').value);
        sendButton.textContent = `Connect Wallet to Send (${prices.card * qty} POL)`;
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

// Update the initialization function to start timer immediately
document.addEventListener('DOMContentLoaded', async function() {
    // Start countdown immediately with default date
    updateCountdown();
    setInterval(updateCountdown, 1000);

    try {
        // Initialize contract date and other data
        await initializeContractDate();
        
        // Update UI elements that depend on contract data
        await Promise.all([
            updatePrices(),
            loadValentines()
        ]);
        
        // Update UI elements that depend on both
        updateValentineCardButton();
        updateInstructions();
        
        initializeCarousel();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

// Update the initialization function to be more robust
async function initializeContractDate() {
    try {
        const contractDate = await getValentineDate();
        // console.log('Contract date loaded:', contractDate);
        if (!contractDate || !contractDate.month || !contractDate.day) {
            console.warn('Invalid contract date, using default');
            valentineDate = { month: 2, day: 14 }; // Default fallback
        } else {
            valentineDate = contractDate;
        }
    } catch (error) {
        console.error('Error initializing contract date:', error);
    }
}

function getCurrentUTCDate() {
    if (DEV_MODE) {
        // In dev mode, simulate Valentine's Day
        const now = new Date();
        return new Date(Date.UTC(
            now.getUTCFullYear(),
            valentineDate.month - 1,  // Convert to 0-based month
            valentineDate.day,
            now.getUTCHours(),
            now.getUTCMinutes(),
            now.getUTCSeconds()
        ));
    }
    return new Date();
}

function isValentinesDay(date) {
    return date.getUTCMonth() === (valentineDate.month - 1) && 
           date.getUTCDate() === valentineDate.day;
}

function updateCountdown() {
    const now = getCurrentUTCDate();
    const currentYear = now.getUTCFullYear();
    const isToday = isValentinesDay(now);
    
    const countdownContainer = document.getElementById('countdown-container');
    const valentineCard = document.querySelector('.valentine-card');
    const valentinesBanner = document.getElementById('valentines-banner');
    const walletButton = document.getElementById('connectWallet');
    const daysElements = document.querySelectorAll('.days-section');
    let targetDate;
    
    // Check if we need to update the countdown label
    const existingLabel = countdownContainer.querySelector('.countdown-label');
    
    if (isToday) {
        // Show Valentine's banner, minting form, and wallet button
        valentinesBanner.style.display = 'block';
        valentineCard.style.display = 'block';
        walletButton.classList.add('visible');
        
        // Hide days section on Valentine's Day
        daysElements.forEach(el => el.style.display = 'none');
        
        // Count down to end of Valentine's Day
        targetDate = new Date(Date.UTC(currentYear, valentineDate.month - 1, valentineDate.day + 1)); // Next day at midnight
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
        // Show days section when counting down to Valentine's Day
        daysElements.forEach(el => el.style.display = 'flex');
        
        // Count down to next Valentine's Day
        targetDate = new Date(Date.UTC(currentYear, valentineDate.month - 1, valentineDate.day));
        if (now > targetDate) {
            targetDate = new Date(Date.UTC(currentYear + 1, valentineDate.month - 1, valentineDate.day));
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
    // console.log('Countdown updated:', days, hours, minutes, seconds);

    updateInstructions();
}

// Add quantity change handler
document.getElementById('quantity').addEventListener('change', function() {
    const quantity = parseInt(this.value);
    const customMessageToggle = document.getElementById('customMessage');
    const messageToggleContainer = document.querySelector('.message-toggle');
    updateSendButton()
    if (quantity > 1) {
        customMessageToggle.checked = false;
        document.getElementById('valentineMessage').style.display = 'none';
        messageToggleContainer.style.display = 'none';
    } else {
        messageToggleContainer.style.display = 'block';
    }
});

// Update existing custom message handler to check quantity
document.getElementById('customMessage').addEventListener('change', function() {
    const quantity = parseInt(document.getElementById('quantity').value);
    if (quantity > 1) {
        this.checked = false;
        return;
    }
    if (this.checked) {
        const messageArea = document.getElementById('valentineMessage');
        messageArea.style.display = 'block';
        const quantityWrapper = document.getElementById('quantity-wrapper');
        quantityWrapper.style.display = 'none';
    } else {
        const messageArea = document.getElementById('valentineMessage');
        messageArea.style.display = 'none';
        const quantityWrapper = document.getElementById('quantity-wrapper');
        quantityWrapper.style.display = 'flex';
    }
});

function updateInstructions() {
    const now = getCurrentUTCDate();
    const isToday = isValentinesDay(now);
    
    const instructionsContent = document.getElementById('instructions-content');
    
    if (isToday) {
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
async function loadValentines(append = false) {
    const receivedSection = document.querySelector('.received-valentines');
    const valentinesGrid = document.querySelector('.valentines-grid');
    
    if (!walletConnected || !window.ethereum) {
        receivedSection.style.display = 'none';
        return;
    }
    
    if (!append) {
        receivedSection.style.display = 'block';
        valentinesGrid.innerHTML = '<div class="loading"><span class="heart-loader">💝</span> Loading your valentines...</div>';
        currentIndex = 0;
    }
    
    if (isLoading) return;
    isLoading = true;
    
    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const address = accounts[0];
        
        const valentines = await fetchValentines(address, currentIndex, currentIndex + BATCH_SIZE);
        
        if (valentines.length === 0 && currentIndex === 0) {
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
        
        if (!append) {
            valentinesGrid.innerHTML = '';
        } else {
            // Remove loading indicator if it exists
            const loadingEl = valentinesGrid.querySelector('.loading-more');
            if (loadingEl) loadingEl.remove();
        }
        
        valentines.forEach(valentine => {
            valentinesGrid.innerHTML += createValentineCard(valentine);
        });
        
        // Add loading indicator if there might be more items
        if (valentines.length === BATCH_SIZE) {
            valentinesGrid.innerHTML += '<div class="loading-more"><span class="heart-loader">💝</span> Loading more valentines...</div>';
            currentIndex += BATCH_SIZE;
            
            // Observe the new loading indicator
            const newLoadingMore = valentinesGrid.querySelector('.loading-more');
            if (newLoadingMore && observer) {
                observer.observe(newLoadingMore);
            }
        }
        
        initializeModalHandlers();
        
        // Initialize intersection observer only once
        if (!append) {
            initializeInfiniteScroll();
        }
    } catch (error) {
        console.error('Error loading valentines:', error);
        if (!append) {
            valentinesGrid.innerHTML = '<div class="error">Error loading valentines 💔</div>';
        }
    } finally {
        isLoading = false;
    }
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

// Update the infinite scroll initialization
function initializeInfiniteScroll() {
    const options = {
        root: document.querySelector('.valentines-grid'),
        rootMargin: '100px',
        threshold: 0.1
    };
    
    // Disconnect existing observer if it exists
    if (observer) {
        observer.disconnect();
    }
    
    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading) {
                loadValentines(true);
            }
        });
    }, options);
    
    // Observe the loading more element
    const loadingMore = document.querySelector('.loading-more');
    if (loadingMore) {
        observer.observe(loadingMore);
    }
}

// Add loading style

async function updatePrices() {
    try {
        const prices = await getMintPrices();
        // console.log(prices);
        
        // Update the message toggle label with actual price
        const messageLabel = document.querySelector('label[for="customMessage"]');
        messageLabel.textContent = `Add Custom Message (Additional ${prices.message} POL)`;
        
        // Update price values using IDs
        const mintPriceElement = document.getElementById('mint-price');
        const messagePriceElement = document.getElementById('message-price');
        
        if (mintPriceElement) {
            mintPriceElement.textContent = `${prices.card} POL`;
        }
        
        if (messagePriceElement) {
            messagePriceElement.textContent = `+${prices.message} POL`;
        }
        
        // Update the main button text if wallet is not connected
        if (!walletConnected) {
            const sendButton = document.querySelector('.valentine-card button');
            const qty = parseInt(document.getElementById('quantity').value);
            sendButton.textContent = `Connect Wallet to Send (${prices.card * qty} POL)`;
        }
    } catch (error) {
        console.error('Error updating prices:', error);
    }
}

// Add this function to initialize the carousel
function initializeCarousel() {
    const track = document.querySelector('.profile-track');
    const carousel = document.querySelector('.profile-carousel');
    
    // Create profile cards
    profiles.forEach(profile => {
        const card = document.createElement('div');
        card.className = 'profile-card';
        card.innerHTML = `
            <div class="profile-image-container">
                <img src="${profile.image}" alt="${profile.name}" class="profile-image">
            </div>
            <div class="profile-info">
                <div class="profile-name">${profile.name}</div>
                ${isValentinesDay(getCurrentUTCDate()) ? `
                    <button class="send-valentine-btn" data-address="${profile.address}">
                        Send Valentine 💝
                    </button>
                ` : ''}
            </div>
        `;
        track.appendChild(card);
    });

    // Duplicate cards for seamless infinite scroll
    const cards = [...track.children];
    cards.forEach(card => {
        const clone = card.cloneNode(true);
        track.appendChild(clone);
    });

    // Add wheel event handler for horizontal scrolling
    carousel.addEventListener('wheel', (e) => {
        e.preventDefault();
        carousel.scrollLeft += e.deltaY;
    });

    // Add click handlers for the send valentine buttons
    document.querySelectorAll('.send-valentine-btn').forEach(button => {
        button.addEventListener('click', () => {
            const address = button.dataset.address;
            document.getElementById('recipientAddress').value = address;
            document.getElementById('create-valentine').scrollIntoView({ behavior: 'smooth' });
        });
    });
}