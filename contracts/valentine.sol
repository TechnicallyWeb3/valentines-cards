// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC721GenerativeSVG.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./BokkyBooBahsDateTimeLibrary.sol";

contract ValentineNFT is ERC721GenerativeSVG, Ownable, ERC721Enumerable {
    // libraries
    using BokkyPooBahsDateTimeLibrary for uint256;

    // constructor
    constructor(
        string memory _name,
        string memory _symbol,
        string[] memory _traitIds,
        string[] memory _traitLabels,
        address _SVGAssembler,
        Price memory _mintPrice
    )
        Ownable(msg.sender)
        ERC721(_name, _symbol)
        ERC721GenerativeSVG(
            _traitIds,
            _traitLabels,
            _SVGAssembler
        )
    {
        defaultSVGData = SVGData(1000,1000,true,true, traitIds);
        valentineDate = Date(2,1);
        mintPrice = _mintPrice;
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
    uint256 pseudoRandomSeed;
    SVGData internal defaultSVGData;
    Date public valentineDate;
    Price public mintPrice;
    mapping(uint256 tokenId => ValentineMetadata) internal valentineMetadata;
    mapping(address => bool) public _isScheduler; // addresses of scheduler smart contracts

    // modifiers
    modifier isMintDate() {
        (uint256 year, uint256 month, uint256 day) = block.timestamp.timestampToDate();
        if (month != valentineDate.month || day != valentineDate.day) revert NotMintDate();
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
        uint256 tokenID = totalSupply() + 1;
        _mint(to, tokenID);
        valentineMetadata[tokenID].mintYear = block.timestamp.getYear();
        valentineMetadata[tokenID].sender = from;
        _generateRandomStats(tokenID);
    }

    function _bulkMint(Valentine[] memory _valentines) internal {
        for (uint256 i = 0; i < _valentines.length; i++) {
            _mintFrom(_valentines[i].to, _valentines[i].from);
        }
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
        valentineMetadata[tokenId].message = message;
    }

    function bulkMint(Valentine[] memory _valentines) public payable isMintDate() enoughValue(_valentines.length, 0) {
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

    // errors
    error StatsAlreadyGenerated();
    error InsufficientPayment();
    error NotMintDate();
    error NotMintYear();
    error NotSender();
    error NotAuthorized();
}
