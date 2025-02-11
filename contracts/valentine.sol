// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC721GenerativeSVG.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./BokkyBooBahsDateTimeLibrary.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract ValentineNFT is ERC721GenerativeSVG, Ownable, ERC721Enumerable, ERC2981 {
    // libraries
    using BokkyPooBahsDateTimeLibrary for uint256;

    // constructor
    constructor(
        string memory _name,
        string memory _symbol,
        string[] memory _traitIds,
        string[] memory _traitLabels,
        address _SVGAssembler,
        Price memory _mintPrice,
        Date memory _valentineDate,
        string memory _contractJson
    )
        Ownable(msg.sender)
        ERC721(_name, _symbol)
        ERC721GenerativeSVG(
            _traitIds,
            _traitLabels,
            _SVGAssembler
        )
    {
        defaultSVGData = SVGData(540,756,true,true, traitIds);
        valentineDate = _valentineDate;
        mintPrice = _mintPrice;
        contractJson = _contractJson;
        // Set default royalty to 5% (500 = 5% of 10000)
        _setDefaultRoyalty(msg.sender, 500);
    }

    // structs
    struct Date {
        uint256 month;
        uint256 day;
    }

    struct Price {
        uint256 card;
        uint256 message;
    }

    struct ValentineMetadata {
        uint256 mintYear;
        address sender;
        string message;
        bool statsGenerated;
    }

    struct Valentine {
        address to;
        address from;
        string message;
    }

    // state variables
    string private contractJson;
    uint256 pseudoRandomSeed;
    SVGData internal defaultSVGData;
    Date public valentineDate;
    Price public mintPrice;
    mapping(uint256 tokenId => ValentineMetadata) public valentineMetadata;
    mapping(address => bool) public _isScheduler; // addresses of scheduler smart contracts

    uint256 public constant MAX_BATCH_SIZE = 100;
    uint256 public constant MAX_MESSAGE_LENGTH = 280; // Twitter-length messages

    // modifiers
    modifier isMintDate() {
        (uint256 year, uint256 month, uint256 day) = block.timestamp.timestampToDate();
        if (month != valentineDate.month || day != valentineDate.day) revert NotMintDate();
        if (owner() == address(0)) revert MintingDisabled();
        _;
    }

    modifier isMintYear(uint256 tokenId) {
        if (valentineMetadata[tokenId].mintYear != block.timestamp.getYear()) revert NotMintYear();
        _;
    }

    modifier isSender(uint256 tokenId) {
        if (valentineMetadata[tokenId].sender != msg.sender) revert NotSender();
        _;
    }

    modifier isScheduler() {
        if (!_isScheduler[msg.sender]) revert NotAuthorized();
        _;
    }
    modifier enoughValue(uint256 _cards, uint256 _messages) {
        uint256 totalPrice = (mintPrice.card * _cards) + (mintPrice.message * _messages);
        if (msg.value < totalPrice) revert InsufficientPayment();
        _;
    }

    // functions
    // owner functions
    function setPrice(Price memory _price) external onlyOwner() {
        mintPrice = _price;
    }

    function setContractJson(string memory _contractJson) external onlyOwner() {
        contractJson = _contractJson;
    }

    function setSchedulerAddress(
        address _schedulerContract,
        bool _status
    ) public onlyOwner {
        _isScheduler[_schedulerContract] = _status;
    }

    function setSVGLayer(
        string memory _traitId,
        string memory _traitValue,
        string memory _svg
    ) external payable isValidTraitId(_traitId) onlyOwner() {
        _setSVGLayer(_traitId, _traitValue, _svg);
    }

    // internal functions
    function _random() internal view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.timestamp,
                        msg.sender,
                        pseudoRandomSeed
                    )
                )
            );
    }

    function _generateTrait(uint8 trait) internal view returns (uint256) {
        require(trait < traitIds.length, "Trait out of range");
        uint256 maxTrait = traitData[traitIds[trait]].length;
        return
            uint256(keccak256(abi.encodePacked(pseudoRandomSeed, trait))) %
            maxTrait;
    }

    function _generateRandomStats(uint256 tokenId) internal {
        _requireOwned(tokenId);
        if (valentineMetadata[tokenId].statsGenerated) revert StatsAlreadyGenerated();
        for (uint8 i = 0; i < traitIds.length; i++) {
            tokenStats[tokenId][traitIds[i]] = _generateTrait(i);
        }
        pseudoRandomSeed = _random();
        valentineMetadata[tokenId].statsGenerated = true;
    }

    function _mintFrom(address to, address from) internal {
        uint256 tokenId = totalSupply() + 1;
        _mint(to, tokenId);
        valentineMetadata[tokenId].mintYear = block.timestamp.getYear();
        valentineMetadata[tokenId].sender = from;
        _generateRandomStats(tokenId);
        emit ValentineMinted(to, from, tokenId);
    }

    function _bulkMint(Valentine[] memory _valentines) internal {
        for (uint256 i = 0; i < _valentines.length; i++) {
            if (bytes(_valentines[i].message).length > MAX_MESSAGE_LENGTH) revert MessageTooLong();
            uint256 tokenId = totalSupply() + 1;
            _mintFrom(_valentines[i].to, _valentines[i].from);
            if (bytes(_valentines[i].message).length > 0) {
                valentineMetadata[tokenId].message = _valentines[i].message;
                emit MessageAdded(tokenId, _valentines[i].message);
            }
        }
        emit BatchMinted(msg.sender, _valentines.length);
    }

    // public functions
    function getTokenSVG(uint256 tokenId) public view returns(string memory svg) {
        _requireOwned(tokenId);
        svg = _getTokenSVG(tokenId, defaultSVGData);
    }

    function mint(address _to) public payable isMintDate() enoughValue(1, 0) {
        _mintFrom(_to, msg.sender);
    }

    function addMessage(uint256 tokenId, string memory message) public payable isSender(tokenId) enoughValue(0, 1) {
        if (bytes(message).length > MAX_MESSAGE_LENGTH) revert MessageTooLong();
        valentineMetadata[tokenId].message = message;
        emit MessageAdded(tokenId, message);
    }

    function bulkMint(Valentine[] memory _valentines) public payable isMintDate() enoughValue(_valentines.length, 0) {
        if (_valentines.length > MAX_BATCH_SIZE) revert BatchTooLarge();
        uint256 bulkPrice = _valentines.length * mintPrice.card;
        for (uint256 i = 0; i < _valentines.length; i++) {
            _valentines[i].from = msg.sender;
            if (bytes(_valentines[i].message).length > 0) {
                bulkPrice += mintPrice.message;
            }
        }
        if (msg.value < bulkPrice) revert InsufficientPayment();
        _bulkMint(_valentines);
    }

    function schedulerMint(Valentine[] memory _valentines) public payable isScheduler() {
        _bulkMint(_valentines);
    }

    function tokenURI(
        uint256 _tokenId
    ) public view override returns (string memory) {
        if (ownerOf(_tokenId) == address(0)) revert ERC721NonexistentToken(_tokenId);
        string memory svg = getTokenSVG(_tokenId);

        string memory message = valentineMetadata[_tokenId].message;
        uint256 traitLength = traitIds.length + 2;

        string[] memory attributeParts;

        if (bytes(message).length == 0) {
            attributeParts = new string[](traitLength);
        } else {
            traitLength++;
            attributeParts = new string[](traitLength);
            attributeParts[traitLength - 1] = string(
                abi.encodePacked(
                    '{"trait_type":"Message","value":"',
                    valentineMetadata[_tokenId].message,
                    '"}'
                )
            );
        }

        attributeParts[traitIds.length] = string(
            abi.encodePacked(
                '{"trait_type":"Mint Year","value":"',
                Strings.toString(valentineMetadata[_tokenId].mintYear),
                '"}'
            )
        );

        attributeParts[traitIds.length + 1] = string(
            abi.encodePacked(
                '{"trait_type":"Sender","value":"',
                Strings.toHexString(valentineMetadata[_tokenId].sender),
                '"}'
            )
        );

        for (uint i = 0; i < traitIds.length; i++) {
            attributeParts[i] = string(
                abi.encodePacked(
                    '{"trait_type":"',
                    traitNames[traitIds[i]],
                    '","value":"',
                    traitData[traitIds[i]][
                        tokenStats[_tokenId][traitIds[i]]
                    ].traitName,
                    '"}'
                )
            );
        }

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(
                        abi.encodePacked(
                            '{"name":"',
                            name(),
                            " #",
                            Strings.toString(_tokenId),
                            '","description":"An immutable Valentine\'s Day Card NFT.","image":"data:image/svg+xml;base64,',
                            svg,
                            '","attributes":[',
                            _joinStrings(attributeParts, ","),
                            "]}"
                        )
                    )
                )
            );
    }

    function contractURI() public view returns (string memory) {
        return contractJson;
    }

    // Helper function to join strings with separator
    function _joinStrings(
        string[] memory parts,
        string memory separator
    ) internal pure returns (string memory) {
        if (parts.length == 0) return "";
        string memory result = parts[0];
        for (uint i = 1; i < parts.length; i++) {
            result = string(abi.encodePacked(result, separator, parts[i]));
        }
        return result;
    }

    function withdraw(address to) public onlyOwner {
        (bool success, ) = to.call{value: address(this).balance}("");
        require(success, "Failed to send Ether");
    }

    //  Add supportsInterface override to handle multiple inheritance
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Optional: Add function to update royalty info
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    // errors
    error StatsAlreadyGenerated();
    error InsufficientPayment();
    error NotMintDate();
    error NotMintYear();
    error NotSender();
    error NotAuthorized();
    error MessageTooLong();
    error BatchTooLarge();
    error MintingDisabled();

    // Add these events at the top of the contract
    event MessageAdded(uint256 indexed tokenId, string message);
    event BatchMinted(address indexed minter, uint256 quantity);
    event ValentineMinted(address indexed to, address indexed from, uint256 tokenId);
}
