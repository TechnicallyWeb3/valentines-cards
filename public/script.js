import { getValentineDate, fetchValentines, getMintPrices, mintValentine, batchMintValentines, NETWORK_DETAILS } from './contractConfig.js';
import { getTikTokData, getTikTokAddress, getTikTokUser } from './tiktokUtils.js';

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
        name: "Gary Veynerchuck",
        image: "https://i.seadn.io/gae/YX3nBiTQ1N7Pa6ymJTD2I9ihuxiwVY-gvBloyt5vf8QMitXYKX_KEdf7FyfTGaD9BObTmO6E4OzDUKrsli0w8B7xRc-jqJnqhIxu5Q?auto=format&dpr=1&w=256",
        address: "0x5ea9681c3ab9b5739810f8b91ae65ec47de62119"
    },
    {
        name: "Donald Trump",
        image: "https://www.whitehouse.gov/wp-content/uploads/2025/01/Donald-J-Trump.jpg",
        address: "0x94845333028B1204Fbe14E1278Fd4Adde46B22ce"
    },
    {
        name: "Paris Hilton",
        image: "https://i.seadn.io/gcs/files/4351d491a6e60dc3915d555762e5dadb.jpg?auto=format&dpr=1&w=256",
        address: "0xB6Aa5a1AA37a4195725cDF1576dc741d359b56bd"
    },
    {
        name: "@properchaos",
        image: "https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/bcac1f30218a27ff90eadd3c78851db7~c5_1080x1080.jpeg?lk3s=a5d48078&nonce=58942&refresh_token=c60685511cf175bfbacfdce7cd27eb02&x-expires=1739300400&x-signature=FWEf1CWjJAiLHYbbYd%2FDYGy%2FO%2Bo%3D&shp=a5d48078&shcp=81f88b70",
        address: "0xEaa9c1Fbd89b0245994dd0162F51Ae675069F117"
    },
    {
        name: "Steve Aoki",
        image: "https://i.seadn.io/gae/FDYglkKVkwubS6YrgjWa8Nqa6E47sccB41Va7u0OlvmQwUiOrKiCund13JVSXzLZx76ms--QcVgonfqCbMEBuUMTDmSy9mWsRt-d?auto=format&dpr=1&w=256",
        address: "0xe4bBCbFf51e61D0D95FcC5016609aC8354B177C4"
    },
    // Add more profiles as needed
];

// Add this to your globals
let recipients = [];

// Call this function after the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeFirstRecipientCard();
    document.getElementById('addRecipientButton').addEventListener('click', createRecipientCard);
});

// Add this function to create a recipient object
function createRecipient(address = '', quantity = 1, message = '') {
    return {
        address,
        quantity,
        message,
        expanded: false
    };
}

// Function to render all recipients
// TODO: Change the format to be more flexible
function renderRecipients() {
    const container = document.querySelector('.recipients-container');
    
    if (recipients.length === 0) {
        // Add a single empty recipient
        recipients.push(createRecipient());
        container.innerHTML = `
            <div class="recipient-card">
                <div class="recipient-header">
                    <div class="address-input" id="recipient-address-0">
                        <input type="text" 
                            class="recipient-address" 
                            value="" 
                            placeholder="Recipient's Polygon Address"
                            onchange="updateRecipient(0, 'address', this.value)">
                    </div>
                    <div class="quantity-wrapper" id="quantity-wrapper-0">
                        <span class="multiply">×</span>
                        <input type="number" 
                            class="quantity-input" 
                            value="1" 
                            min="1" 
                            max="100"
                            onchange="updateRecipient(0, 'quantity', this.value)">
                    </div>
                    <button class="toggle-details" onclick="toggleRecipientDetails(0)">▶</button>
                    <button class="remove-recipient" onclick="removeRecipient(0)">×</button>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recipients.map((recipient, index) => `
        <div class="recipient-card">
            <div class="recipient-header">
                <div class="address-input">
                    <input type="text" 
                        class="recipient-address" 
                        value="${recipient.address}" 
                        placeholder="Recipient's Polygon Address"
                        onchange="updateRecipient(${index}, 'address', this.value)">
                </div>
                <div class="quantity-wrapper">
                    <span class="multiply">×</span>
                    <input type="number" 
                        class="quantity-input" 
                        value="${recipient.quantity}" 
                        min="1" 
                        max="100"
                        onchange="updateRecipient(${index}, 'quantity', this.value)">
                </div>
                <button class="toggle-details" onclick="toggleRecipientDetails(${index})">
                    ${recipient.expanded ? '▼' : '▶'}
                </button>
                <button class="remove-recipient" onclick="removeRecipient(${index})">×</button>
            </div>
            ${recipient.expanded ? `
                <div class="recipient-details">
                    ${Array(recipient.quantity).fill().map((_, cardIndex) => `
                        <div class="card-message">
                            <label>Card ${cardIndex + 1} Message:</label>
                            <textarea 
                                placeholder="Write your sweet message here..."
                                onchange="updateCardMessage(${index}, ${cardIndex}, this.value)"
                            >${recipient.messages?.[cardIndex] || ''}</textarea>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');

    // Update the main send button text
    updateSendButtonText();
}

// Update the recipient data
function updateRecipient(index, field, value) {
    recipients[index][field] = value;
    if (field === 'quantity') {
        if (value > 1) {
            recipients[index].messages = recipients[index].messages || [];
            recipients[index].messages.length = parseInt(value);
        } else {
            removeRecipient(index);
            return;
        }
    }
    renderRecipients();
}

function updateCardMessage(recipientIndex, cardIndex, message) {
    recipients[recipientIndex].messages = recipients[recipientIndex].messages || [];
    recipients[recipientIndex].messages[cardIndex] = message;
}

function toggleRecipientDetails(index) {
    recipients[index].expanded = !recipients[index].expanded;
    renderRecipients();
}

function removeRecipient(index) {
    recipients.splice(index, 1);
    renderRecipients();
}

function addRecipient(profileData = null) {
    if (profileData) {
        recipients.push(createRecipient(profileData.address, 1, ''));
    } else {
        recipients.push(createRecipient());
    }
    renderRecipients();
}

// Update the send valentine function
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

// Update the wallet connection handler
document.getElementById('connectWallet').addEventListener('click', async () => {
    await connectWallet();
});

// Add new function to update send button
async function updateSendButton() {
    const sendButton = document.getElementById('sendValentineButton');
    if (!walletConnected) {
        // const prices = await getMintPrices();
        // const qty = parseInt(document.getElementById('quantity').value);
        sendButton.textContent = `Connect Wallet to Send`;
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
            const targetChainId = `0x${Number(NETWORK_DETAILS.chainId).toString(16)}`; // Convert to hex
            const networkDetails = NETWORK_DETAILS;

            // Check if we're on the correct network
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            
            if (chainId !== targetChainId) {
                try {
                    // Try to switch to target network
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: targetChainId }],
                    });
                } catch (switchError) {
                    // If the network isn't added to MetaMask, add it
                    if (switchError.code === 4902) {
                        try {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [networkDetails],
                            });
                        } catch (addError) {
                            throw new Error(`Could not add ${networkDetails.chainName}`);
                        }
                    } else {
                        throw new Error(`Could not switch to ${networkDetails.chainName}`);
                    }
                }
            }

            // Continue with existing wallet connection code...
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
            alert('Error connecting wallet: ' + error.message);
        }
    } else {
        alert('Please install MetaMask or another Web3 wallet to connect!');
    }
}

// Update the chainChanged listener as well
if (window.ethereum) {
    window.ethereum.on('chainChanged', (chainId) => {
        const targetChainId = `0x${Number(NETWORK_ID).toString(16)}`;
        if (chainId !== targetChainId) {
            walletConnected = false;
            updateSendButton();
            const button = document.getElementById('connectWallet');
            button.innerHTML = `👛 <span class="wallet-text-long">Wrong Network</span>`;
            button.style.backgroundColor = '#ffe0e0';
        } else {
            // Reconnect if we switch back to the correct network
            connectWallet();
        }
    });
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
        const existingButton = valentineCard.querySelector('button:nth-of-type(2)');
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

        // Test TikTok functionality
        console.log("Testing TikTok integration...");
        
        // Test 1: Get TikTok Data
        console.log("Test 1: Getting TikTok user data");
        const userData = await getTikTokData("technicallyweb3");
        console.log("TikTok User Data:", userData);

        // Test 2: Get Address (only if we got a valid userId)
        if (userData.success) {
            console.log("Test 2: Getting blockchain address");
            const addressData = await getTikTokAddress(userData.userId);
            console.log("Blockchain Address Data:", addressData);
        }

        // Test 3: Combined function
        console.log("Test 3: Getting complete user info");
        const completeUser = await getTikTokUser("technicallyweb3");
        console.log("Complete User Data:", completeUser);
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

// Replace the existing custom message handler with this new one
document.addEventListener('click', function(e) {
    if (e.target.closest('.customize-button')) {
        const button = e.target.closest('.customize-button');
        const content = button.closest('.recipient-card').querySelector('.customize-content');
        
        button.classList.toggle('active');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            // Optional: Smooth animation
            content.style.maxHeight = content.scrollHeight + 'px';
        } else {
            content.style.display = 'none';
            content.style.maxHeight = null;
        }
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
                <p class="year">${valentine.year}</p>
                <p class="sender">From: <a href="https://polygonscan.com/address/${valentine.sender}" 
                    target="_blank" class="address-link">${formatAddress(valentine.sender)}</a></p>
                ${valentine.message ? `<br><p class="message">"${valentine.message}"</p>` : ''}
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
    
    // document.querySelectorAll('.received-valentine').forEach(card => {
    //     card.addEventListener('click', function(e) {
    //         if (e.target.classList.contains('address-link')) {
    //             return;
    //         }
            
    //         const thumbnail = this.querySelector('.nft-image');
    //         const sender = this.querySelector('.address-link');
    //         const year = this.querySelector('.year').textContent;
    //         const message = this.querySelector('.message').textContent;
            
    //         modalImage.src = thumbnail.src;
    //         modalSender.innerHTML = `From: ${sender.outerHTML}`;
    //         modalYear.textContent = year;
    //         modalMessage.textContent = message;
            
    //         modal.style.display = 'flex';
    //     });
    // });
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
        console.log(prices);
        
        // Update the message toggle label with actual price
        // const messageLabel = document.querySelector('label[for="customMessage"]');
        // messageLabel.textContent = `Add Custom Message (Additional ${prices.message} POL)`;
        
        // Update price values using IDs
        const mintPriceElement = document.getElementById('mint-price');
        const messagePriceElement = document.getElementById('message-price');
        
        if (mintPriceElement) {
            mintPriceElement.textContent = `${prices.card} POL`;
        }
        
        if (messagePriceElement) {
            messagePriceElement.textContent = `+${prices.message} POL`;
        }
        
        // // Update the main button text if wallet is not connected
        // if (!walletConnected) {
        //     const sendButton = document.getElementById('send-connect-btn');
        //     sendButton.textContent = `Connect Wallet to Send`;
        // }
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
                <img src="${profile.image}" alt="${profile.name}" class="profile-image" height="100%" width="100%">
            </div>
            <div class="profile-info">
                <div class="profile-name">${profile.name}</div>
                ${isValentinesDay(getCurrentUTCDate()) ? `
                    <button class="send-valentine-btn" id="send-connect-btn">
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

    // // Update the send valentine button click handler
    // document.getElementById('send-connect-btn').addEventListener('click', () => {
    //     if (walletConnected) {
    //         document.getElementById('create-valentine').scrollIntoView({ behavior: 'smooth' });
    //     } else {
    //         connectWallet();
    //     }
    // });
}

// Add this function to update the send button text
function updateSendButtonText() {
    const sendButton = document.querySelector('.send-valentines-btn');
    if (!sendButton) return;

    if (!walletConnected) {
        sendButton.textContent = 'Connect Wallet to Send';
    } else {
        const totalCards = recipients.reduce((sum, recipient) => sum + recipient.quantity, 0);
        const totalCustomMessages = recipients.reduce((sum, recipient) => 
            sum + (recipient.messages?.filter(msg => msg?.trim().length > 0).length || 0), 0);
        
        const basePrice = totalCards;
        const messagePrice = totalCustomMessages * 5;
        const totalPrice = basePrice + messagePrice;
        
        sendButton.textContent = `Send${totalCards > 1 ? " " + totalCards : ""} Valentine${totalCards !== 1 ? 's' : ''} (${totalPrice} POL)`;
    }
}

// Select the send button
const sendButton = document.querySelector('.valentine-card .send-valentines-btn');

// Function to create a new recipient card
function createRecipientCard() {
    const recipientCard = document.createElement('div');
    recipientCard.className = 'recipient-card'; // Class name for the recipient card
    recipientCard.innerHTML = `
        <div class="input-group">
            <div class="address-input">
                <input type="text" placeholder="Recipient's Polygon Address">
            </div>
            <div style="margin-bottom:15px" class="quantity-wrapper" id="quantity-wrapper">
                <button class="quantity-button" id="decrementButton">-</button>
                <input type="number" value="1" min="1" max="10" class="recipient-quantity-input tokenAmount">
                <button class="quantity-button" id="incrementButton">+</button>
            </div>
        </div>
        <button class="view-more-button">View messages</button>
        <div class="additional-inputs-container" style="display: none; margin-top: 5px;"></div>
        <button class="remove-recipient" onclick="removeRecipient(this)">Remove Recipient</button>
        <div class="customize-tab">
            <button class="customize-button">
                Customize Valentines
                <span class="arrow-down">▼</span>
            </button>
        </div>
        <div class="customize-content" style="display: none;"></div>
    `;

    // Insert the new recipient card before the "Add New Recipient" button
    const addRecipientButton = document.getElementById('addRecipientButton');
    addRecipientButton.parentNode.insertBefore(recipientCard, addRecipientButton); // Insert before the button

    // Add event listener for the "View Messages" button
    const viewMoreButton = recipientCard.querySelector('.view-more-button');
    viewMoreButton.addEventListener('click', function() {
        const additionalInputsContainer = recipientCard.querySelector('.additional-inputs-container');
        if (additionalInputsContainer.style.display === 'none' || additionalInputsContainer.style.display === '') {
            additionalInputsContainer.style.display = 'block'; // Show the container
            const quantity = parseInt(recipientCard.querySelector('.recipient-quantity-input').value);
            generateAdditionalInputs(additionalInputsContainer, quantity); // Pass the container and quantity
        } else {
            additionalInputsContainer.style.display = 'none'; // Hide the container
        }
    });

    // Add event listeners for the quantity buttons
    const decrementButton = recipientCard.querySelector('#decrementButton');
    const incrementButton = recipientCard.querySelector('#incrementButton');
    const quantityInput = recipientCard.querySelector('.recipient-quantity-input');

    decrementButton.addEventListener('click', function() {
        let currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
        }
    });

    incrementButton.addEventListener('click', function() {
        let currentValue = parseInt(quantityInput.value);
        if (currentValue < 10) {
            quantityInput.value = currentValue + 1;
        }
    });

    
}

// // Function to initialize the first recipient card
function initializeFirstRecipientCard() {
    const firstRecipientCard = document.querySelector('.recipient-card');
    if (firstRecipientCard) {
        const viewMoreButton = firstRecipientCard.querySelector('#viewMoreButton');
        viewMoreButton.addEventListener('click', function() {
            const additionalInputsContainer = firstRecipientCard.querySelector('#additionalInputsContainer');
            if (additionalInputsContainer.style.display === 'none' || additionalInputsContainer.style.display === '') {
                additionalInputsContainer.style.display = 'block'; // Show the container
                const quantity = parseInt(firstRecipientCard.querySelector('.quantity-input').value);
                generateAdditionalInputs(additionalInputsContainer, quantity); // Pass the container and quantity
            } else {
                additionalInputsContainer.style.display = 'none'; // Hide the container
            }
        });
    }
}

// Function to generate additional input fields based on quantity
function generateAdditionalInputs(container, quantity) {
    container.innerHTML = ''; // Clear previous inputs

    for (let i = 0; i < quantity; i++) {
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.placeholder = `Additional Input ${i + 1}`;
        inputField.className = 'additional-input';
        container.appendChild(inputField);
    }
}


