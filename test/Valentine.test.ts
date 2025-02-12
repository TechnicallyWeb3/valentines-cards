import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { traits } from "../artwork/testTraits.svg";

describe("ValentineNFT", function () {
  let valentineNFT: Contract;
  let valentineNFT2: Contract;
  let dataPointStorage: Contract;
  let dataPointRegistry: Contract;
  let svgAssembler: Contract;
  let owner: SignerWithAddress;

  const traitIds = ["BACKGROUND", "ILLUSTRATION", "TEXT"];
  const traitNames = ["Background", "Illustration", "Text"];
  
  // Get today's UTC date
  const today = new Date();
  const currentDate = {
    month: today.getUTCMonth() + 1, // getMonth() returns 0-11
    day: today.getUTCDate()
  };
  
  // Tomorrow's date for testing invalid date
  const tomorrow = new Date();
  tomorrow.setUTCDate(today.getUTCDate() + 1);
  const tomorrowDate = {
    month: tomorrow.getUTCMonth() + 1,
    day: tomorrow.getUTCDate()
  };

  async function deployContracts(date = currentDate) {
    // Deploy DataPointStorage
    const DataPointStorage = await ethers.getContractFactory("DataPointStorage");
    dataPointStorage = await DataPointStorage.deploy();

    // Deploy DataPointRegistry
    const DataPointRegistry = await ethers.getContractFactory("DataPointRegistry");
    dataPointRegistry = await DataPointRegistry.deploy(
      await dataPointStorage.getAddress(),
      owner.address,
      1
    );

    // Deploy SVGAssembler
    const SVGAssembler = await ethers.getContractFactory("SVGAssembler");
    svgAssembler = await SVGAssembler.deploy(
      await dataPointRegistry.getAddress()
    );

    // Deploy ValentineNFT
    const ValentineNFT = await ethers.getContractFactory("ValentineNFT");
    valentineNFT = await ValentineNFT.deploy(
      "Valentine NFT",
      "VNFT",
      traitIds,
      traitNames,
      await svgAssembler.getAddress(),
      { card: ethers.parseEther("0.01"), message: ethers.parseEther("0.005") },
      currentDate,
      "https://eternal.cards/contract.json"
    );
    const ValentineNFT2 = await ethers.getContractFactory("ValentineNFT");
    valentineNFT2 = await ValentineNFT2.deploy(
      "Valentine NFT",
      "VNFT",
      traitIds,
      traitNames,
      await svgAssembler.getAddress(),
      { card: ethers.parseEther("0.01"), message: ethers.parseEther("0.005") },
      tomorrowDate,
      "https://eternal.cards/contract.json"
    );
  }

  async function setupTraits() {
    // Set one trait for each category
    await valentineNFT.setSVGLayer(
      traits.backgrounds.id,
      traits.backgrounds.traits[0].name,
      traits.backgrounds.traits[0].svg
    );

    await valentineNFT.setSVGLayer(
      traits.illustrations.id,
      traits.illustrations.traits[0].name,
      traits.illustrations.traits[0].svg
    );

    await valentineNFT.setSVGLayer(
      traits.texts.id,
      traits.texts.traits[0].name,
      traits.texts.traits[0].svg
    );
  }

  async function setupTraits2() {
    // Set one trait for each category
    await valentineNFT2.setSVGLayer(
      traits.backgrounds.id,
      traits.backgrounds.traits[0].name,
      traits.backgrounds.traits[0].svg
    );

    await valentineNFT2.setSVGLayer(
      traits.illustrations.id,
      traits.illustrations.traits[0].name,
      traits.illustrations.traits[0].svg
    );

    await valentineNFT2.setSVGLayer(
      traits.texts.id,
      traits.texts.traits[0].name,
      traits.texts.traits[0].svg
    );

  }

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    await deployContracts();
  }); 

  describe("Minting", function () {
    it("Should fail to mint when no SVG layers are set", async function () {
      await expect(
        valentineNFT.mint(owner.address, {
          value: ethers.parseEther("0.01")
        })
      ).to.be.reverted;
    });

    it("Should fail to mint on wrong date", async function () {
      // Deploy contract with tomorrow's date
      await deployContracts(tomorrowDate);
      await setupTraits2();

      await expect(
        valentineNFT2.mint(owner.address, {
          value: ethers.parseEther("0.01")
        })
      ).to.be.revertedWithCustomError(valentineNFT2, "NotMintDate");
    });

    it("Should allow minting after setting one of each trait type on correct date", async function () {
      await setupTraits();

      // Now minting should succeed
      await expect(
        valentineNFT.mint(owner.address, {
          value: ethers.parseEther("0.01")
        })
      ).to.not.be.reverted;
    });

    it("Should allow minting with multiple traits per category", async function () {
      // Add all background traits
      for (const trait of traits.backgrounds.traits) {
        await valentineNFT.setSVGLayer(
          traits.backgrounds.id,
          trait.name,
          trait.svg
        );
      }

      // Add minimum required traits for other categories
      await valentineNFT.setSVGLayer(
        traits.illustrations.id,
        traits.illustrations.traits[0].name,
        traits.illustrations.traits[0].svg
      );

      await valentineNFT.setSVGLayer(
        traits.texts.id,
        traits.texts.traits[0].name,
        traits.texts.traits[0].svg
      );

      // Mint multiple NFTs
      for (let i = 0; i < 3; i++) {
        await expect(
          valentineNFT.mint(owner.address, {
            value: ethers.parseEther("0.01")
          })
        ).to.not.be.reverted;
      }
    });

    it("Should correctly track NFT balances", async function () {
      await setupTraits();
      
      // Check initial balance
      expect(await valentineNFT.balanceOf(owner.address)).to.equal(0);
      
      // Mint one NFT
      await valentineNFT.mint(owner.address, {
        value: ethers.parseEther("0.01")
      });
      
      // Check balance after first mint
      expect(await valentineNFT.balanceOf(owner.address)).to.equal(1);
      
      // Mint another NFT
      await valentineNFT.mint(owner.address, {
        value: ethers.parseEther("0.01")
      });
      
      // Check balance after second mint
      expect(await valentineNFT.balanceOf(owner.address)).to.equal(2);
    });
  });

  describe("Batch Minting", function () {
    beforeEach(async function () {
      await setupTraits();
    });

    it("Should calculate correct price for batch mint with messages", async function () {
      const valentines = [
        { to: owner.address, from: ethers.ZeroAddress, message: "Love you!" },
        { to: owner.address, from: ethers.ZeroAddress, message: "" },
        { to: owner.address, from: ethers.ZeroAddress, message: "Be mine!" }
      ];

      // Calculate expected price: 3 cards + 2 messages
      const expectedPrice = (BigInt(3) * (await valentineNFT.mintPrice()).card) +
        (BigInt(2) * (await valentineNFT.mintPrice()).message);

      // Should fail with insufficient payment
      await expect(
        valentineNFT.bulkMint(valentines, {
          value: expectedPrice - BigInt(1)
        })
      ).to.be.revertedWithCustomError(valentineNFT, "InsufficientPayment");

      // Should succeed with exact payment
      await expect(
        valentineNFT.bulkMint(valentines, {
          value: expectedPrice
        })
      ).to.not.be.reverted;

      // Verify NFTs were minted
      expect(await valentineNFT.balanceOf(owner.address)).to.equal(3);
    });

    it("Should fail batch mint on wrong date", async function () {
      const valentines = [
        { to: owner.address, from: ethers.ZeroAddress, message: "" },
        { to: owner.address, from: ethers.ZeroAddress, message: "" }
      ];

      await expect(
        valentineNFT2.bulkMint(valentines, {
          value: (await valentineNFT2.mintPrice()).card * BigInt(2)
        })
      ).to.be.revertedWithCustomError(valentineNFT2, "NotMintDate");
    });

    it("Should properly inscribe messages during batch mint", async function () {
      const valentines = [
        { to: owner.address, from: ethers.ZeroAddress, message: "Message 1" },
        { to: owner.address, from: ethers.ZeroAddress, message: "" },
        { to: owner.address, from: ethers.ZeroAddress, message: "Message 3" }
      ];

      // Mint the batch
      await valentineNFT.bulkMint(valentines, {
        value: (BigInt(3) * (await valentineNFT.mintPrice()).card) +
          (BigInt(2) * (await valentineNFT.mintPrice()).message)
      });

      // Verify messages for each token
      for (let i = 1; i <= 3; i++) {
        const uri = await valentineNFT.tokenURI(i);
        const json = JSON.parse(
          Buffer.from(uri.replace("data:application/json;base64,", ""), "base64").toString()
        );
        
        const messageAttribute = json.attributes.find(
          (attr: any) => attr.trait_type === "Message"
        );

        if (i === 2) {
          // Token #2 should not have a message attribute
          expect(json.attributes.length).to.equal(5); // 3 traits + mint year + sender
          expect(messageAttribute).to.be.undefined;
        } else {
          // Tokens #1 and #3 should have their respective messages
          console.log(json.attributes);
          expect(json.attributes.length).to.equal(6); // 3 traits + mint year + sender + message
          expect(messageAttribute).to.exist;
          expect(messageAttribute.value).to.equal(`Message ${i}`);
        }
      }
    });

    it("Should handle maximum batch size of 100", async function () {
      
      // Create array of 100 valentines
      const valentines = Array(100).fill(null).map(() => ({
        to: owner.address,
        from: ethers.ZeroAddress,
        message: ""
      }));

      // Calculate price for 100 cards
      const price = BigInt(100) * (await valentineNFT.mintPrice()).card;

      // Should succeed with 100 valentines
      await expect(
        valentineNFT.bulkMint(valentines, {
          value: price
        })
      ).to.not.be.reverted;

      // Try with 101 valentines
      const tooManyValentines = Array(101).fill(null).map(() => ({
        to: owner.address,
        from: ethers.ZeroAddress,
        message: ""
      }));

      await expect(
        valentineNFT.bulkMint(tooManyValentines, {
          value: price + (await valentineNFT.mintPrice()).card
        })
      ).to.be.revertedWithCustomError(valentineNFT, "BatchTooLarge");
    });

    it("Should enforce maximum message length of 280 characters", async function () {
      
      // Create a message exactly 280 characters
      const maxMessage = "A".repeat(280);
      
      // Should succeed with 280 character message
      await expect(
        valentineNFT.bulkMint([{
          to: owner.address,
          from: ethers.ZeroAddress,
          message: maxMessage
        }], {
          value: (await valentineNFT.mintPrice()).card + (await valentineNFT.mintPrice()).message
        })
      ).to.not.be.reverted;

      // Try with 281 characters
      const tooLongMessage = "A".repeat(281);
      
      await expect(
        valentineNFT.bulkMint([{
          to: owner.address,
          from: ethers.ZeroAddress,
          message: tooLongMessage
        }], {
          value: (await valentineNFT.mintPrice()).card + (await valentineNFT.mintPrice()).message
        })
      ).to.be.revertedWithCustomError(valentineNFT, "MessageTooLong");

      // Test in batch context
      const batchWithLongMessage = [
        { to: owner.address, from: ethers.ZeroAddress, message: "Short message" },
        { to: owner.address, from: ethers.ZeroAddress, message: tooLongMessage },
        { to: owner.address, from: ethers.ZeroAddress, message: "Another short message" }
      ];

      await expect(
        valentineNFT.bulkMint(batchWithLongMessage, {
          value: (BigInt(3) * (await valentineNFT.mintPrice()).card) + 
                 (BigInt(3) * (await valentineNFT.mintPrice()).message)
        })
      ).to.be.revertedWithCustomError(valentineNFT, "MessageTooLong");
    });
  });

  describe("TokenURI", function () {
    beforeEach(async function () {
      await setupTraits();
    });

    it("Should fail for non-existent token", async function () {
      await expect(
        valentineNFT.tokenURI(1)
      ).to.be.revertedWithCustomError(valentineNFT, "ERC721NonexistentToken");
    });

    it("Should return valid tokenURI for minted token without message", async function () {
      // Mint a token
      await valentineNFT.mint(owner.address, {
        value: ethers.parseEther("0.01")
      });

      const uri = await valentineNFT.tokenURI(1);
      
      // Verify it's a base64 encoded JSON string
      expect(uri).to.include("data:application/json;base64,");
      
      // Decode and parse the JSON
      const json = JSON.parse(
        Buffer.from(uri.replace("data:application/json;base64,", ""), "base64").toString()
      );

      // Verify JSON structure
      expect(json).to.have.property("name");
      expect(json).to.have.property("description");
      expect(json).to.have.property("image");
      expect(json).to.have.property("attributes");
      
      // Verify attributes
      expect(json.attributes).to.be.an("array");

    //   console.log(json.attributes);
    //   console.log("Attributes length: ", json.attributes.length);
      expect(json.attributes.length).to.equal(5); // 3 traits + mint year + sender
    });

    it("Should return valid tokenURI for minted token with message", async function () {
      // Create valentine with message
    //   const valentine = {
    //     to: owner.address,
    //     from: ethers.ZeroAddress,
    //     message: "Happy Valentine's Day!"
    //   };

      // Mint with message in single transaction
      const cardTx = await valentineNFT.mint(owner.address, {
        value: (await valentineNFT.mintPrice()).card
      });
      await cardTx.wait();

      const messageTx = await valentineNFT.addMessage(1, "Happy Valentine's Day!", {
        value: (await valentineNFT.mintPrice()).message
      });
      await messageTx.wait();

      const uri = await valentineNFT.tokenURI(1);
      
      // Decode and parse the JSON
      const response = Buffer.from(uri.replace("data:application/json;base64,", ""), "base64").toString()
    //   console.log(response);
      const json = JSON.parse(response);
    //   console.log(json.attributes);

      // Get total supply since this is an ERC721Enumerable
      const supply = await valentineNFT.totalSupply();
      expect(supply).to.equal(1); // We've only minted one token

      // Verify attributes length (should include message)
      expect(json.attributes.length).to.equal(6); // 3 traits + mint year + sender + message
      
      // Find message attribute
      const messageAttribute = json.attributes.find(
        (attr: any) => attr.trait_type === "Message"
      );
      expect(messageAttribute).to.exist;
      expect(messageAttribute.value).to.equal("Happy Valentine's Day!");
    });
  });

  describe("Large Trait Gas Tests", function () {
    beforeEach(async function () {
      [owner] = await ethers.getSigners();
      await deployContracts();
    });

    function getStringSizeInKB(str: string) {
      return (new TextEncoder().encode(str).length / 1024).toFixed(2);
    }

    async function checkRoyalty(svgData: string) {
      const request = {
        mimeType: "0x6973",
        charset: "0x7508",
        location: "0x0101",
        data: svgData,
      };

      const packed = ethers.concat([
        ethers.getBytes(request.mimeType),
        ethers.getBytes(request.charset),
        ethers.getBytes(request.location),
        ethers.toUtf8Bytes(request.data)
      ]);
      const dataPointAddress = ethers.keccak256(packed);
      
      return await dataPointRegistry.getRoyalty(dataPointAddress);
    }

    it("Should handle a single large trait (37kb)", async function () {
      // Create a large SVG (targeting approximately 37kb)
      const largePath = `<path d="M 0 0 ${Array(420).fill("L 100 100 L 0 100").join(" ")}" fill="none" stroke="black"/>`;
      const largeSVG = `<g>${Array(5).fill(largePath).join("")}</g>`;
      
      console.log(`Large SVG size: ${getStringSizeInKB(largeSVG)}kb`);
      
      // Check royalty before setting layer
      const royalty = await checkRoyalty(largeSVG);
      if (royalty > 0) {
        console.log(`Royaltys required: ${royalty}`);
      }
      
      // Set one large background trait
      await valentineNFT.setSVGLayer(
        traits.backgrounds.id,
        "Large Background",
        largeSVG
      );

      // Set minimum required traits for other categories
      await valentineNFT.setSVGLayer(
        traits.illustrations.id,
        traits.illustrations.traits[0].name,
        traits.illustrations.traits[0].svg
      );

      await valentineNFT.setSVGLayer(
        traits.texts.id,
        traits.texts.traits[0].name,
        traits.texts.traits[0].svg
      );

      // Mint token and verify URI
      await valentineNFT.mint(owner.address, {
        value: (await valentineNFT.mintPrice()).card
      });

      const uri = await valentineNFT.tokenURI(1);
      const json = JSON.parse(
        Buffer.from(uri.replace("data:application/json;base64,", ""), "base64").toString()
      );
      expect(json.image).to.include("data:image/svg+xml;base64,");
    });

    it("Should handle multiple medium-sized traits (3x 37kb)", async function () {
      // Create medium SVGs (targeting approximately 37kb each)
      const mediumPath = `<path d="M 0 0 ${Array(250).fill("L 100 100 L 0 100").join(" ")}" fill="none" stroke="black"/>`;
      const mediumSVG = `<g>${Array(5).fill(mediumPath).join("")}</g>`;

      console.log(`Medium SVG size: ${getStringSizeInKB(mediumSVG)}kb`);

      // Set all three medium traits
      await valentineNFT.setSVGLayer(
        traits.backgrounds.id,
        "Medium Background",
        mediumSVG,
        { value: 0 }
      );

      // Check royalty once since we're using the same SVG data
      const royalty = await checkRoyalty(mediumSVG);
      if (royalty > 0) {
        // console.log(`Royaltyd required: ${royalty}`);
      }

      await valentineNFT.setSVGLayer(
        traits.illustrations.id,
        "Medium Illustration",
        mediumSVG,
        { value: royalty }
      );

      await valentineNFT.setSVGLayer(
        traits.texts.id,
        "Medium Text",
        mediumSVG,
        { value: royalty }
      );

      // Mint token and verify URI
      await valentineNFT.mint(owner.address, {
        value: (await valentineNFT.mintPrice()).card
      });

      const uri = await valentineNFT.tokenURI(1);
      console.log(`URI size (base64): ${getStringSizeInKB(uri)}kb`);

      const json = JSON.parse(
        Buffer.from(uri.replace("data:application/json;base64,", ""), "base64").toString()
      );
      console.log(`JSON size (utf-8): ${getStringSizeInKB(JSON.stringify(json))}kb`);
      console.log(`Image size (base64): ${getStringSizeInKB(json.image)}kb`);
      console.log(`Image size (utf-8): ${getStringSizeInKB(Buffer.from(json.image.replace("data:image/svg+xml;base64,", ""), "base64").toString())}kb`);

      expect(json.image).to.include("data:image/svg+xml;base64,");
    });

    it("Should handle minting and URI generation with maximum traits", async function () {
      // Create medium-sized SVGs for all possible traits
      const mediumPath = `<path d="M 0 0 ${Array(500).fill("L 100 100 L 0 100").join(" ")}" fill="none" stroke="black"/>`;
      const mediumSVG = `<g>${Array(2).fill(mediumPath).join("")}</g>`;

      // Check royalty once since we're using the same SVG data
      let royalty = 0n;

      // Add multiple traits for each category
      for (let i = 0; i < 5; i++) {

        const firstTx = await valentineNFT.setSVGLayer(
          traits.backgrounds.id,
          `Background ${i}`,
          mediumSVG,
          { value: royalty }
        );
        await firstTx.wait();

        // Check royalty once since we're using the same SVG data
        royalty = await checkRoyalty(mediumSVG) * 110n / 100n;
        // if (royalty > 0) {
        //     console.log(`Royaltya required: ${royalty}`);
        // }

        await valentineNFT.setSVGLayer(
          traits.illustrations.id,
          `Illustration ${i}`,
          mediumSVG,
          { value: royalty }
        );

        await valentineNFT.setSVGLayer(
          traits.texts.id,
          `Text ${i}`,
          mediumSVG,
          { value: royalty }
        );
      }

      // Mint multiple tokens and verify URIs
      for (let i = 0; i < 3; i++) {
        await valentineNFT.mint(owner.address, {
          value: (await valentineNFT.mintPrice()).card
        });

        // Verify URI generation
        const uri = await valentineNFT.tokenURI(i + 1);
        const json = JSON.parse(
          Buffer.from(uri.replace("data:application/json;base64,", ""), "base64").toString()
        );
        expect(json.image).to.include("data:image/svg+xml;base64,");
      }
    });

    it("Should handle real valentine traits combination", async function () {
      // Import specific traits from valentineTraits
      const { traits } = await import("../artwork/valentines.svg");
      
      // Log sizes of the specific traits we're testing
      const backgroundSVG = traits.backgrounds.traits[0].svg;
      const illustrationSVG = traits.illustrations.traits[22].svg;
      const textSVG = traits.texts.traits[14].svg;
      
      console.log(`Background SVG size: ${getStringSizeInKB(backgroundSVG)}kb`);
      console.log(`Illustration SVG size: ${getStringSizeInKB(illustrationSVG)}kb`);
      console.log(`Text SVG size: ${getStringSizeInKB(textSVG)}kb`);

      // Check royalties for each trait
      const backgroundRoyalty = await checkRoyalty(backgroundSVG);
      const illustrationRoyalty = await checkRoyalty(illustrationSVG);
      const textRoyalty = await checkRoyalty(textSVG);

      // Set the traits with proper royalty payments
      await valentineNFT.setSVGLayer(
        traits.backgrounds.id,
        traits.backgrounds.traits[0].name,
        backgroundSVG,
        { value: backgroundRoyalty }
      );

      await valentineNFT.setSVGLayer(
        traits.illustrations.id,
        traits.illustrations.traits[22].name,
        illustrationSVG,
        { value: illustrationRoyalty }
      );

      await valentineNFT.setSVGLayer(
        traits.texts.id,
        traits.texts.traits[14].name,
        textSVG,
        { value: textRoyalty }
      );

      // Mint token and verify URI
      await valentineNFT.mint(owner.address, {
        value: (await valentineNFT.mintPrice()).card
      });

      const uri = await valentineNFT.tokenURI(1);
      const json = JSON.parse(
        Buffer.from(uri.replace("data:application/json;base64,", ""), "base64").toString()
      );
      
      // Log the final sizes
      console.log(`URI size (base64): ${getStringSizeInKB(uri)}kb`);
      console.log(`JSON size (utf-8): ${getStringSizeInKB(JSON.stringify(json))}kb`);
      console.log(`Image size (base64): ${getStringSizeInKB(json.image)}kb`);
      console.log(`Image size (utf-8): ${getStringSizeInKB(Buffer.from(json.image.replace("data:image/svg+xml;base64,", ""), "base64").toString())}kb`);

      expect(json.image).to.include("data:image/svg+xml;base64,");
    });
  });
}); 