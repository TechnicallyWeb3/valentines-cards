// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BokkyBooBahsDateTimeLibrary.sol";

contract DateTimeTest{
    using BokkyPooBahsDateTimeLibrary for uint256;

    
    constructor(
        Date memory _date
    ) {
        require(_date.month < 13 && _date.day < 32, "Invalid date");
        MINT_DATE = _date;
    }

    struct Date {
        uint256 month;
        uint256 day;
    }

    Date public MINT_DATE;

    // describe modifier in video demo
    modifier isMintDate() {
        (uint256 year, uint256 month, uint256 day) = block
            .timestamp
            .timestampToDate();
        require(
            month == MINT_DATE.month && day == MINT_DATE.day,
            "Not mint day"
        );
        _;
    }

   // describe return in video demo
    function _isDate(uint256 _compareMonth, uint256 _compareDay) internal view returns (bool) {
        return 
            _blockMonth() == _compareMonth && _blockDay() == _compareDay;
    }

    function _blockDay() internal view returns (uint256) {
        return block.timestamp.getDay();
    }

    function _blockMonth() internal view returns (uint256) {
        return block.timestamp.getMonth();
    }

    function isDate(uint256 _timestamp) public view returns (bool) {
        return _isDate(_timestamp.getMonth(), _timestamp.getDay());
    }

    function isContractDate() public view returns (bool) {
        return _isDate(MINT_DATE.month, MINT_DATE.day);
    }
}
