import * as cheerio from 'cheerio';
import { ethers } from 'ethers';
import TikTokenABI from '../../public/contracts/TikToken.json';

const TIKTOKEN_ADDRESS = "YOUR_TIKTOKEN_CONTRACT_ADDRESS";

function getDateFromTikTokId(idNum: string): Date {
    // Convert the video ID to a BigInt to ensure it can handle large numbers
    const bigIntID = BigInt(idNum);

    // Convert the video ID to binary and take the first 32 bits
    let binaryString = bigIntID.toString(2);
    console.log(binaryString)
    while (binaryString.length < 64) {
        binaryString = '0' + binaryString
        console.log(binaryString.length)
    }

    //pad string to 64 chars
    const first32Bits = binaryString.slice(0, 32);
    console.log(binaryString)
    console.log(first32Bits)
    // Convert the first 32 bits back to decimal to get the Unix timestamp
    const unixTimestamp = parseInt(first32Bits, 2);
    const registerDate = unixTimestamp > 1400000000 ? unixTimestamp : 1500000000
    return new Date(registerDate * 1000);
}

export async function getTiktokData(user: string) {
    const url = new URL(`https://tiktok.com/@${user}`)

    const response = await fetch(url)

    const html = await response.text()

    const $ = cheerio.load(html)
    // console.log(html)
    const appContext = $("#SIGI_STATE").text();
    const json = JSON.parse(appContext);
    // console.log(json)

    let userData = json.UserModule['users'];
    const handle = Object.keys(userData)[0];
    console.log(handle)
    userData = userData[handle]
    const platform = 'TikTok'
    const idNum = userData.id
    const id = userData.secUid
    const name = userData.nickname
    const date = getDateFromTikTokId(idNum)
    const lgImage = userData.avatarLarger
    const mdImage = userData.avatarMedium
    const smImage = userData.avatarThumb
    const bio = userData.signature
    const verified = userData.verified
    const statsData = json.UserModule['stats'][handle];
    const followers = statsData.followerCount
    const following = statsData.followingCount
    const likes = statsData.heartCount
    const posts = statsData.videoCount

    const fqid = idNum
    // const fqid = `${platform}://${id}` // for fqid upgrade

    const data = {
        platform: platform,
        id: id,
        handle: handle,
        name: name,
        registerDate: date,
        smImage: smImage,
        mdImage: mdImage,
        lgImage: lgImage,
        bio: bio,
        verified: verified,
        followers: followers,
        following: following,
        likes: likes,
        posts: posts,
        hasMinted: await TikToken.hasMinted(fqid),
        account: await TikToken.getUserAccount(fqid),
    }

    // console.log(data)

    return data
}

export async function getTikTokAddress(handle: string): Promise<{address: string | null, message: string}> {
    try {
        // Fetch TikTok profile page
        const url = new URL(`https://tiktok.com/@${handle}`);
        const response = await fetch(url);
        const html = await response.text();

        // Parse the HTML to get user ID
        const $ = cheerio.load(html);
        const appContext = $("#SIGI_STATE").text();
        const json = JSON.parse(appContext);
        
        const userData = json.UserModule['users'];
        const userHandle = Object.keys(userData)[0];
        const userId = userData[userHandle].id;

        // Get provider from window.ethereum
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Create contract instance using the ABI from the JSON file
        const contract = new ethers.Contract(
            TIKTOKEN_ADDRESS,
            TikTokenABI.abi,
            provider
        );

        // Get user's registered address using getUserAccount function
        const address = await contract.getUserAccount(userId);

        // Check if address is null address (0x0)
        if (address === "0x0000000000000000000000000000000000000000") {
            return {
                address: null,
                message: "This TikTok user has not registered for TikToken"
            };
        }

        return {
            address,
            message: "Address found!"
        };

    } catch (error) {
        console.error("Error fetching TikTok data:", error);
        return {
            address: null,
            message: "Error fetching TikTok data"
        };
    }
}