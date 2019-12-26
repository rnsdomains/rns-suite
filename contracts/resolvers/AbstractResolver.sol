pragma solidity ^0.5.3;

contract AbstractResolver {
    function supportsInterface(bytes4 interfaceID) public pure returns (bool);
}
