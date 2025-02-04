// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./SVGAssembler.sol";

abstract contract ERC721GenerativeSVG {
    // libraries
    // constructor
    constructor(
        string[] memory _traitIds,
        string[] memory _traitNames,
        address _svgAssembler
    ) {
        _setTraitCategories(_traitIds, _traitNames);
        svgAssembler = SVGAssembler(_svgAssembler);
    }

    //structs
    struct Trait {
        string traitName;
        bytes32 svgAddress;
    }

    // state variables
    SVGAssembler internal svgAssembler;
    mapping(bytes32 traitId => Trait[] traits) internal traitData;

    bytes32[] internal traitIds;
    mapping (bytes32 traitId => string) internal traitNames;

    mapping(uint256 tokenId => mapping(bytes32 traitId => uint256 stat))
        internal tokenStats;

    // modifiers
    modifier isValidTraitId(string memory _traitId) {
        bytes32 hashedId = keccak256(abi.encodePacked(_traitId));
        bool found = false;
        
        for (uint256 i = 0; i < traitIds.length; i++) {
            if (traitIds[i] == hashedId) {
                found = true;
                break;
            }
        }
        
        if (!found) revert InvalidTraitId(_traitId);
        _;
    }

    // functions
    function _setTraitCategories(
        string[] memory _traitIds,
        string[] memory _traitNames
    ) internal virtual {
        require(
            _traitIds.length == _traitNames.length,
            "Trait IDs and names must have the same length"
        );
        // deletes to reset, overriding this function is dangerous and could break lots of stuff.
        delete traitIds;
        for (uint256 i = 0; i < _traitIds.length; i++) {
            bytes32 traitId = keccak256(abi.encodePacked(_traitIds[i]));
            traitIds.push(traitId);
            traitNames[traitId] = _traitNames[i];
        }
    }

    function _setSVGLayer(
        string memory _traitId,
        string memory _traitValue,
        string memory _svg
    ) internal virtual {
        bytes32 svgLayerAddress = svgAssembler.setSVGLayerData{value: msg.value}(
            _svg,
            msg.sender
        );
        traitData[keccak256(abi.encodePacked(_traitId))].push(Trait(_traitValue, svgLayerAddress));
    }

    function _assembleSVG(
        uint256[] memory _traitList,
        SVGData memory _svgData
    ) internal view virtual returns (string memory) {
        require(
            _traitList.length == traitIds.length,
            "Trait list must have the same length as trait IDs"
        );

        // Create array to store SVG addresses
        bytes32[] memory svgAddresses = new bytes32[](_traitList.length);
        
        // For each trait category
        for (uint256 i = 0; i < traitIds.length; i++) {
            // Get the trait array for this category
            Trait[] storage traits = traitData[traitIds[i]];
            
            // Ensure the selected trait index exists
            require(
                _traitList[i] < traits.length,
                "Trait index out of bounds"
            );
            
            // Get the SVG address for the selected trait
            svgAddresses[i] = traits[_traitList[i]].svgAddress;
        }

        SVGData memory svg = SVGData(
            _svgData.height,
            _svgData.width,
            _svgData.viewbox,
            _svgData.base64,
            svgAddresses  // Pass the assembled addresses to SVGAssembler
        );
        
        return svgAssembler.assembleSVG(svg);
    }

    function _getTokenSVG(uint256 _tokenId, SVGData memory _svgData) internal view returns (string memory) {
        // Create array to store SVG addresses directly
        bytes32[] memory svgAddresses = new bytes32[](traitIds.length);
        
        // Single iteration to get SVG addresses for each trait
        for (uint256 i = 0; i < traitIds.length; i++) {
            // Get the trait array for this category
            Trait[] storage traits = traitData[traitIds[i]];
            
            // Get the token's trait index for this category
            uint256 traitIndex = tokenStats[_tokenId][traitIds[i]];
            
            // Ensure the trait index exists
            require(
                traitIndex < traits.length,
                "Trait index out of bounds"
            );
            
            // Get the SVG address directly
            svgAddresses[i] = traits[traitIndex].svgAddress;
        }

        SVGData memory svg = SVGData(
            _svgData.height,
            _svgData.width,
            _svgData.viewbox,
            _svgData.base64,
            svgAddresses
        );
        
        return svgAssembler.assembleSVG(svg);
    }

    
    // events
    // errors
    error InvalidTraitId(string traitId);
    error Unoriginal(uint256 value);
}
