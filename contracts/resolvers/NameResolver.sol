pragma solidity ^0.5.3;

import "./ResolverBase.sol";
import "../rns/AbstractRNS.sol";

/// source: https://github.com/ensdomains/resolvers/blob/master/contracts/profiles/NameResolver.sol
contract NameResolver is ResolverBase {
    bytes4 constant private NAME_INTERFACE_ID = 0x691f3431;
    AbstractRNS rns;

    event NameChanged(bytes32 indexed node, string name);

    mapping(bytes32=>string) names;

    modifier onlyOwner (bytes32 node) {
        require(msg.sender == rns.owner(node), "Only owner");
        _;
    }

    constructor (AbstractRNS _rns) public {
        rns = _rns;
    }

    /// @notice Sets the name associated with an RNS node, for reverse records.
    /// @dev May only be called by the owner of that node in the RNS registry.
    /// @param node The node to update.
    /// @param name The name to set.
    function setName(bytes32 node, string calldata name) external onlyOwner(node) {
        names[node] = name;
        emit NameChanged(node, name);
    }

    /// @notice Returns the name associated with an RNS node, for reverse records.
    /// @dev Defined in EIP181.
    /// @param node The node to query.
    /// @return The associated name.
    function name(bytes32 node) external view returns (string memory) {
        return names[node];
    }

    function supportsInterface(bytes4 interfaceID) public pure returns(bool) {
        return interfaceID == NAME_INTERFACE_ID || super.supportsInterface(interfaceID);
    }
}
