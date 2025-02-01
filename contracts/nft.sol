// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./BokkyBooBahsDateTimeLibrary.sol";
import "@tw3/solidity/contracts/wttp/WebStorage.sol";
import "@openzeppelin/contracts/interfaces/IERC4906.sol";


contract AnualNFT is ERC721Enumerable, Ownable, IERC4906 {
    using BokkyPooBahsDateTimeLibrary for uint256;

    // Add these at the contract level, outside any function
    error InvalidDate();
    error InvalidValue();
    error NotMintDate();
    error NotMintYear();
    error NotSender();
    error NotScheduler();
    error StatsAlreadyGenerated();
    error TokenNotExists();
    error InvalidTrait();

    constructor(
        string memory _name,
        string memory _symbol,
        Date memory _date,
        Price memory _price
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        if ((_date.month <= 0 || _date.month >= 13) || (_date.day <= 0 || _date.day >= 32)) revert InvalidDate();
        MINT_DATE = _date;
        MINT_PRICE = _price;
        dataPointStorage = DataPointStorage(
            0x0eA9D9f73cBd2A053451cb9c22DbC3570f7C47C4
        );
        dataPointRegistry = DataPointRegistry(
            0x9885FF0546C921EFb19b1C8a2E10777A9dAc8e88
        );
    }

    DataPointStorage public dataPointStorage;
    DataPointRegistry public dataPointRegistry;

    uint256 pseudoRandomSeed;

    struct Date {
        uint256 month;
        uint256 day;
    }

    Date public MINT_DATE;

    struct Price {
        uint256 mintPrice;
        uint256 addMessagePrice;
    }
    Price public MINT_PRICE;

    struct NFTMetadata {
        uint256 mintYear;
        address sender;
        string message;
        bool statsGenerated;
    }

    mapping(uint256 => NFTMetadata) public nftMetadata; // change to private once tested

    mapping(address => bool) public _isScheduler; // change to private once tested

    bytes32 private constant BACKGROUND = keccak256("BACKGROUND");
    bytes32 private constant ILLUSTRATION = keccak256("ILLUSTRATION");
    bytes32 private constant TEXT = keccak256("TEXT");
    bytes32 private constant FRAME = keccak256("FRAME");

    bytes32[] public traits = [BACKGROUND, ILLUSTRATION, TEXT, FRAME];

    string[] public traitNames = [
        "Background",
        "Illustration",
        "Text",
        "Frame"
    ];

    mapping(bytes32 trait => mapping(uint256 traitIndex => string traitName))
        public individualTraitNames;

    mapping(bytes32 trait => bytes32[] svgAddresses) public svgData;

    mapping(uint256 tokenId => mapping(bytes32 trait => uint256 stat))
        public tokenStats;

    modifier isMintDate() {
        (uint256 year, uint256 month, uint256 day) = block.timestamp.timestampToDate();
        if (month != MINT_DATE.month || day != MINT_DATE.day) revert NotMintDate();
        _;
    }

    modifier isMintYear(uint256 tokenId) {
        if (nftMetadata[tokenId].mintYear != block.timestamp.getYear()) revert NotMintYear();
        _;
    }

    modifier isSender(uint256 tokenId) {
        if (nftMetadata[tokenId].sender != msg.sender) revert NotSender();
        _;
    }

    modifier isScheduler() {
        if (!_isScheduler[msg.sender]) revert NotScheduler();
        _;
    }

    modifier enoughValue(bool _mint, bool _message) {
        if (_mint && _message) {
            if (msg.value < MINT_PRICE.mintPrice + MINT_PRICE.addMessagePrice) revert InvalidValue();
        } else if (_mint) {
            if (msg.value < MINT_PRICE.mintPrice) revert InvalidValue();
        } else if (_message) {
            if (msg.value < MINT_PRICE.addMessagePrice) revert InvalidValue();
        }
        _;
    }

    function setSchedulerAddress(
        address _schedulerContract,
        bool _status
    ) public onlyOwner {
        _isScheduler[_schedulerContract] = _status;
    }

    function setPrice(Price memory _price) public onlyOwner {
        MINT_PRICE = _price;
    }

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
        require(trait < traits.length, "Trait out of range");
        uint256 maxTrait = svgData[traits[trait]].length;
        return
            uint256(keccak256(abi.encodePacked(pseudoRandomSeed, trait))) %
            maxTrait;
    }

    function _generateRandomStats(uint256 tokenId) internal {
        if (nftMetadata[tokenId].statsGenerated) revert StatsAlreadyGenerated();
        for (uint8 i = 0; i < traits.length; i++) {
            tokenStats[tokenId][traits[i]] = _generateTrait(i);
        }
        pseudoRandomSeed = _random();
        nftMetadata[tokenId].statsGenerated = true;
    }

    function _mintFrom(address to, address from) internal {
        uint256 tokenID = totalSupply() + 1;
        _mint(to, tokenID);
        nftMetadata[tokenID].mintYear = block.timestamp.getYear();
        nftMetadata[tokenID].sender = from;
        _generateRandomStats(tokenID);
    }

    function _addMessage(uint256 tokenId, string memory message) internal {
        nftMetadata[tokenId].message = message;
    }

    function mint(
        address to
    ) public payable isMintDate enoughValue(true, false) {
        _mintFrom(to, msg.sender);
    }

    function addMessage(
        uint256 tokenId,
        string memory message
    )
        public
        payable
        isMintDate
        isMintYear(tokenId)
        isSender(tokenId)
        enoughValue(false, true)
    {
        _addMessage(tokenId, message);
        emit MetadataUpdate(tokenId);
    }

    function mintWithMessage(
        address to,
        string memory message
    ) public payable isMintDate enoughValue(true, true) {
        _mintFrom(to, msg.sender);
        _addMessage(totalSupply(), message);
    }

    struct Valentine {
        address to;
        string message;
    }

    function mintMultiple(Valentine[] memory valentines) public isMintDate {
        for (uint256 i = 0; i < valentines.length; i++) {
            mint(valentines[i].to);
            if (bytes(valentines[i].message).length > 0) {
                _addMessage(totalSupply(), valentines[i].message);
            }
        }
    }

    struct ScheduledValentine {
        address to;
        address from;
        string message;
    }

    function scheduledMint(
        ScheduledValentine[] memory valentines
    ) public isMintDate isScheduler {
        for (uint256 i = 0; i < valentines.length; i++) {
            _mintFrom(valentines[i].to, valentines[i].from);
            _addMessage(totalSupply(), valentines[i].message);
        }
    }

    function _validTraitCategory(
        string memory traitCategory
    ) public view returns (bool) {
        for (uint i = 0; i < traits.length; i++) {
            if (traits[i] == keccak256(abi.encodePacked(traitCategory))) {
                return true;
            }
        }
        return false;
    }

    function setSVGData(
        string memory traitCategory,
        string memory traitName,
        string memory svg,
        address publisher
    ) external payable onlyOwner {
        require(_validTraitCategory(traitCategory), "Invalid trait category");
        bytes32 traitAddress = keccak256(abi.encodePacked(traitCategory));

        DataPoint memory dataPoint = DataPoint(
            DataPointStructure(0x6973, 0x7508, 0x0101),
            bytes(svg)
        );

        bytes32 svgAddress = dataPointRegistry.writeDataPoint{value: msg.value}(
            dataPoint,
            publisher
        );

        svgData[traitAddress].push(svgAddress);
        individualTraitNames[traitAddress][
            svgData[traitAddress].length - 1
        ] = traitName;
    }

    function getSVGData(uint256 _tokenId) public view returns (string memory) {
        string
            memory svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">';
        for (uint i = 0; i < traits.length; i++) {
            DataPoint memory traitSVGDataPoint = dataPointStorage.readDataPoint(
                svgData[traits[i]][tokenStats[_tokenId][traits[i]]]
            );

            svg = string.concat(svg, string(traitSVGDataPoint.data));
        }
        svg = string.concat(svg, "</svg>");
        return svg;
    }

    function tokenURI(
        uint256 _tokenId
    ) public view override returns (string memory) {
        if (ownerOf(_tokenId) == address(0)) revert TokenNotExists();
        string memory svg = getSVGData(_tokenId);

        string memory message = nftMetadata[_tokenId].message;
        uint256 traitLength = traits.length;

        string[] memory attributeParts;

        if (bytes(message).length == 0) {
            attributeParts = new string[](traits.length + 1);
        } else {
            traitLength++;
            attributeParts = new string[](traitLength + 1);
            attributeParts[traitLength] = string(
                abi.encodePacked(
                    '{"trait_type":"Message","value":"',
                    nftMetadata[_tokenId].message,
                    '"}'
                )
            );
        }

        attributeParts[traits.length] = string(
            abi.encodePacked(
                '{"trait_type":"Mint Year","value":"',
                Strings.toString(nftMetadata[_tokenId].mintYear),
                '"}'
            )
        );

        for (uint i = 0; i < traits.length; i++) {
            attributeParts[i] = string(
                abi.encodePacked(
                    '{"trait_type":"',
                    traitNames[i],
                    '","value":"',
                    individualTraitNames[traits[i]][
                        tokenStats[_tokenId][traits[i]]
                    ],
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
                            Base64.encode(bytes(svg)),
                            '","attributes":[',
                            _joinStrings(attributeParts, ","),
                            "]}"
                        )
                    )
                )
            );
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
}
