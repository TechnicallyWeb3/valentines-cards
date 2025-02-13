import { getValentineDate, fetchValentines, getMintPrices, batchMintValentines, getValentineMetadata, addMessageToToken, NETWORK_DETAILS } from './contractConfig.js';

// Development bypass - set to true to show valentine creation form regardless of date
const DEV_MODE = false;  // Set this to false for production

// Add at the top with other globals
let walletConnected = false;
let valentineDate = { month: 2, day: 14 }; // Default until loaded
let isLoading = false;
let currentIndex = 0;
const BATCH_SIZE = 12;
let sentObserver; // Add this global variable to store the observer for the sent section
let receivedObserver; // Add this global variable to store the observer for the received section
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
let sentValentines = [];

// Update the initialization function to start timer immediately
document.addEventListener('DOMContentLoaded', async function() {
    // Start countdown immediately with default date
    initializeFirstRecipientCard();

    try {
        // Initialize contract date and other data
        await initializeContractDate();
        updateCountdown();
        setInterval(updateCountdown, 1000);
        initializeCarousel();
        
        // Update UI elements that depend on contract data
        await updatePrices();
        updateInstructions();

    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

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

// Update the wallet connection handler
document.getElementById('connectWallet').addEventListener('click', async () => {
    await connectWallet();
});

document.getElementById('sendValentineButton').addEventListener('click', function() {
    if (walletConnected) {
        sendValentine();
    } else {
        connectWallet();
    }
});

document.getElementById('addRecipientButton').addEventListener('click', function() {
    addRecipient();
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
function renderRecipients() {

    console.log("RENDERING RECIPIENTS", recipients);

    const recipientsContainer = document.querySelector('.recipients-container');
    if (recipientsContainer) {
        recipientsContainer.innerHTML = ''; // Clear the container
    }

    recipients.forEach(recipient => {
        addRecipient(recipient.address);
    });
}

// Update the recipient data
function updateRecipient(index, field, value) {
    if (field === 'quantity') {
        value = parseInt(value);
    }

    recipients[index][field] = value;
    console.log("UPDATING RECIPIENT", recipients[index], field, value);

    if (field === 'quantity') {
        if (value > 1) {
            recipients[index].messages = recipients[index].messages || [];
            recipients[index].messages.length = parseInt(value);
        } else if (value <= 0 && index > 0) { // Only remove if it's not the first recipient
            removeRecipient(index);
            return;
        }

        const customizeContent = document.getElementById(`contentRecipient${index}`);
        if (customizeContent) {
            updateMessageFields(index, value, recipients[index].messages || []);
        }
    } else if (field === 'expanded') {
        const content = document.getElementById(`contentRecipient${index}`);
        const button = document.getElementById(`customizeRecipient${index}`);
        button.classList.toggle('active');
        
        if (content.style.display === 'none' || !content.style.display) {
            content.style.display = 'block';
            content.style.maxHeight = content.scrollHeight + 'px';
        } else {
            content.style.display = 'none';
            content.style.maxHeight = null;
        }
    } else if (field === 'address') {
        // don't need to render recipients
        return;
    } else {
        renderRecipients();
    }
}

window.updateRecipient = updateRecipient;

// New helper function to update message fields
function updateMessageFields(index, quantity, messages) {
    const customizeContent = document.getElementById(`contentRecipient${index}`);
    
    // Clear existing content
    customizeContent.innerHTML = '';
    
    // Add message fields based on quantity
    for (let i = 0; i < quantity; i++) {
        const messageContainer = document.createElement('div');
        messageContainer.innerHTML = `
            <label for="recipient${index}Message${i}">#${i + 1}</label>
            <input class="custom-message-input" 
                   type="text" 
                   id="recipient${index}Message${i}" 
                   value="${messages[i] || ''}"
                   placeholder="Write your sweet message here..."
                   oninput="updateCardMessage(${index}, ${i}, this.value)">
        `;
        customizeContent.appendChild(messageContainer);
    }
    
    // Update max height for smooth animation
    customizeContent.style.maxHeight = customizeContent.scrollHeight + 'px';
}

function updateCardMessage(recipientIndex, cardIndex, message) {
    recipients[recipientIndex].messages = recipients[recipientIndex].messages || [];
    recipients[recipientIndex].messages[cardIndex] = message;
    console.log("UPDATING CARD MESSAGE", recipientIndex, cardIndex, message);
}

window.updateCardMessage = updateCardMessage;

function removeRecipient(index) {
    // Remove from data array
    recipients.splice(index, 1);
    
    // Remove from DOM
    const recipientCard = document.getElementById(`recipientCard${index}`);
    if (recipientCard) {
        recipientCard.parentElement.removeChild(recipientCard);
    }
}

// Function to add a new recipient with optional parameters
function addRecipient(address = '', name = '', readonly = false) {
    const index = recipients.length;
    
    // Add to data array
    recipients.push(createRecipient(address, 1, ''));
    
    // Create and add new recipient card to DOM
    const container = document.querySelector('.recipients-container');
    const recipientCard = document.createElement('div');
    recipientCard.className = 'recipient-card';
    recipientCard.id = `recipientCard${index}`;
    
    recipientCard.innerHTML = `
        <div class="input-group">
            <div class="address-input">
                <input type="text" 
                    id="addressRecipient${index}"
                    value="${address}" 
                    placeholder="Recipient's Polygon Address"
                    onchange="updateRecipient(${index}, 'address', this.value)"
                    ${readonly ? 'readonly' : ''}>
            </div>
            <div class="quantity-wrapper">
                <span class="multiply">×</span>
                <input type="number" 
                    id="qtyRecipient${index}"
                    value="${recipients[index].quantity}" 
                    min="${index === 0 ? 1 : 0}" 
                    max="100"
                    class="quantity-input"
                    onchange="updateRecipient(${index}, 'quantity', this.value)">
            </div>
        </div>
        ${name ? `<span class="profile-name">${name}</span>` : ''}
        <div class="customize-content" id="contentRecipient${index}" style="display: none;">
            ${Array(recipients[index].quantity).fill().map((_, i) => `
                <label for="recipient${index}Message${i}">#${i + 1}</label>
                <input class="custom-message-input" 
                       type="text" 
                       id="recipient${index}Message${i}" 
                       value="${recipients[index].messages?.[i] || ''}"
                       placeholder="Write your sweet message..."
                       oninput="updateCardMessage(${index}, ${i}, this.value)">
            `).join('')}
        </div>
        <div class="customize-tab">
            <button class="customize-button" id="customizeRecipient${index}" onclick="updateRecipient(${index}, 'expanded', ${!recipients[index].expanded})">
                Customize Valentines
                <span class="arrow-down">▼</span>
            </button>
        </div>
    `;
    
    container.appendChild(recipientCard);
}

window.addRecipient = addRecipient;

function buildValentineArray() {
    let valentines = [];
    for (let i = 0; i < recipients.length; i++) {
        if (recipients[i].address !== "") {
            for (let j = 0; j < recipients[i].quantity; j++) {
                valentines.push({
                    to: recipients[i].address.trim(),
                    message: recipients[i].messages?.[j] || ""
                });
            }
        } else {
            if (recipients[i].quantity > 1) {
                alert("Did you forget to add an address to recipient #" + (i + 1) + "?");
                return [];
            }
        }
    }
    return valentines;
    
}

// Update the send valentine function to store minted tokens
async function sendValentine() {
    console.log("SENDING VALENTINE");
    const valentines = buildValentineArray();

    // Input validation
    if (valentines.length === 0) {
        console.error('No valentines to send');
        return;
    }

    if (valentines.length > 100) {
        alert('You are trying to send too many valentines! Please limit your order to 100 valentines at a time.');
        return;
    }

    const receivedSection = document.querySelector('.sent-valentines');
    const sentMessage = document.getElementById('sentMessage');
    const valentinesGrids = document.querySelector('.valentines-grids');
    sentMessage.innerHTML = '<div class="valentine-sending">💌 Sending your valentine(s)...</div>';
    sentMessage.style.display = 'block';

    try {
        // Batch mint
        const result = await batchMintValentines(valentines);
        sentMessage.style.display = 'none';
        receivedSection.style.display = 'block';

        // Store the newly minted valentines
        sentValentines = [...sentValentines, ...result.mintedTokens];
        
        // Initialize sent valentines display if this is first mint
        if (sentValentines.length === result.mintedTokens.length) {
            initializeSentValentinesDisplay();
        }

        // refresh sent valentines
        await loadSentValentines();

        // Reset the form to initial state
        recipients = [createRecipient()];
        renderRecipients();
        
    } catch (error) {
        console.error('Error sending valentine:', error);
        sentMessage.innerHTML = `
            <div class="valentine-error">
                <h3>❌ Error Sending Valentine</h3>
                <p>${'Transaction failed. Please try again.'}</p>
            </div>
        `;
    }
}

// Add these new functions for sent valentines handling
let currentSentIndex = 0;
let isSentLoading = false;

function initializeSentValentinesDisplay() {
    const sentSection = document.querySelector('.sent-valentines');
    if (!sentSection.querySelector('.valentines-grids')) {
        sentSection.innerHTML = `
            <h2>Sent Valentines</h2>
            <div class="valentines-grids"></div>
        `;
    }

    // Initialize intersection observer for infinite scrolling
    initializeSentInfiniteScroll();
}

async function loadSentValentines(append = false) {
 const valentinesGrids = document.querySelector('.valentines-grids');
    
    try {
        // Get the next batch of tokens
        const currentBatch = sentValentines.slice(currentSentIndex, currentSentIndex + BATCH_SIZE);
        
        if (currentBatch.length === 0 && currentSentIndex === 0) {
            valentinesGrids.innerHTML = `
                <div class="no-valentines">
                    <p>You haven't sent any valentines yet! 💝</p>
                </div>
            `;
            return;
        }

        if (!append) {
            valentinesGrids.innerHTML = '';
        } else {
            // Remove loading indicator if it exists
            const loadingEl = valentinesGrids.querySelector('.loading-more');
            if (loadingEl) loadingEl.remove();
        }

        // Fetch metadata for each token in the batch
        const metadataPromises = currentBatch.map(token => getValentineMetadata(token.tokenId));
        const metadataArray = await Promise.all(metadataPromises);

        // Add the valentines to the display
        metadataArray.forEach(metadata => {
            valentinesGrids.innerHTML += createValentineSentCard(metadata);
        });

        // Add loading indicator if there might be more items
        if (currentBatch.length === BATCH_SIZE && currentSentIndex + BATCH_SIZE < sentValentines.length) {
            valentinesGrids.innerHTML += '<div class="loading-more"><span class="heart-loader">💝</span> Loading more valentines...</div>';
            currentSentIndex += BATCH_SIZE;

            // Observe the new loading indicator
            const newLoadingMore = valentinesGrids.querySelector('.loading-more');
            if (newLoadingMore && sentObserver) {
                sentObserver.observe(newLoadingMore);
            }
        }

    } catch (error) {
        console.error('Error loading sent valentines:', error);
        if (!append) {
            valentinesGrids.innerHTML = '<div class="error">Error loading sent valentines 💔</div>';
        }
    } finally {
        isSentLoading = false;
    }
}

function initializeSentInfiniteScroll() {
    const options = {
        root: document.querySelector('.valentines-grids'),
        rootMargin: '100px',
        threshold: 0.1
    };

    // Disconnect existing observer if it exists
    if (sentObserver) {
        sentObserver.disconnect();
    }

    sentObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isSentLoading) {
                loadSentValentines(true);
            }
        });
    }, options);

    // Observe the loading more element
    const loadingMore = document.querySelector('.loading-more');
    if (loadingMore) {
        sentObserver.observe(loadingMore);
    }
}

// Add new function to update send button
async function updateSendButton() {
    const sendButton = document.getElementById('sendValentineButton');
    if (!walletConnected) {
        sendButton.textContent = `Connect Wallet to Send`;
    } else {
        sendButton.textContent = 'Send Love ❤️';
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
            loadRecievedValentines();
        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Error connecting wallet: ' + error.message);
        }
    } else {
        alert('Please install MetaMask or another Web3 wallet to connect!');
    }
}

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

// Function to format address for display
function formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Function to create valentine card HTML
function createValentineSentCard(valentine) {
    return `
        <div class="received-valentine">
            <div class="valentine-thumbnail">
                <img src="${valentine.image}" alt="Valentine NFT" class="nft-image">
            </div>
            <div class="valentine-info">
                <p class="year">${valentine.year}</p>
                <p class="sender">From: <a href="https://polygonscan.com/address/${valentine.sender}" 
                    target="_blank" class="address-link">${formatAddress(valentine.sender)}</a></p>
                ${valentine.message 
                    ? `<br><p class="message">"${valentine.message}"</p>` 
                    : `<div class="message-input-container">
                        <textarea
                            id="messageInput${valentine.id}" 
                            class="after-message-input" 
                            placeholder="Write your message..."></textarea>
                        <button onclick="addMessage(${valentine.id})" class="add-message-btn">
                            Add Message
                        </button>
                       </div>`
                }
            </div>
        </div>
    `;
}

// Add the addMessage function
function addMessage(tokenId) {
    const inputElement = document.getElementById(`messageInput${tokenId}`);
    const buttonElement = inputElement.nextElementSibling;
    
    if (inputElement.style.display === 'none') {
        // Show input field
        inputElement.style.display = 'block';
        buttonElement.textContent = 'Save Message';
    } else {
        // Save message
        const message = inputElement.value.trim();
        if (message) {
            console.log(`Saving message for token ${tokenId}: ${message}`);
            addMessageToToken(tokenId, message);
        }
    }
}

// Make addMessage available globally
window.addMessage = addMessage;

function createValentineReceivedCard(valentine) {
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
async function loadRecievedValentines(append = false) {
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
            valentinesGrid.innerHTML += createValentineReceivedCard(valentine);
        });
        
        // Add loading indicator if there might be more items
        if (valentines.length === BATCH_SIZE) {
            valentinesGrid.innerHTML += '<div class="loading-more"><span class="heart-loader">💝</span> Loading more valentines...</div>';
            currentIndex += BATCH_SIZE;
            
            // Observe the new loading indicator
            const newLoadingMore = valentinesGrid.querySelector('.loading-more');
            if (newLoadingMore && receivedObserver) {
                receivedObserver.observe(newLoadingMore);
            }
        }
        
        // Initialize intersection observer only once
        if (!append) {
            initializeRecievedInfiniteScroll();
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

// Update the infinite scroll initialization
function initializeRecievedInfiniteScroll() {
    const options = {
        root: document.querySelector('.valentines-grid'),
        rootMargin: '100px',
        threshold: 0.1
    };
    
    // Disconnect existing observer if it exists
    if (receivedObserver) {
        receivedObserver.disconnect();
    }
    
    receivedObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading) {
                loadRecievedValentines(true);
            }
        });
    }, options);
    
    // Observe the loading more element
    const loadingMore = document.querySelector('.loading-more');
    if (loadingMore) {
        receivedObserver.observe(loadingMore);
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
            mintPriceElement.textContent = `${prices.card} ${NETWORK_DETAILS.nativeCurrency.symbol}`;
        }
        
        if (messagePriceElement) {
            messagePriceElement.textContent = `+${prices.message} ${NETWORK_DETAILS.nativeCurrency.symbol}`;
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
    profiles.forEach((profile) => {
        const card = document.createElement('div');
        card.className = 'profile-card';
        card.innerHTML = `
            <div class="profile-image-container">
                <img src="${profile.image}" alt="${profile.name}" class="profile-image" height="100%" width="100%">
            </div>
            <div class="profile-info">
                <div class="profile-name">${profile.name}</div>
                ${isValentinesDay(getCurrentUTCDate()) ? `
                    <button class="send-valentine-btn" onclick="addRecipient(
                    '${profile.address}', 
                    '${profile.name}', 
                    true
                    )">
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
}

// // Function to initialize the first recipient card
function initializeFirstRecipientCard() {
    if (recipients.length === 0) {
        addRecipient();
    }
}


