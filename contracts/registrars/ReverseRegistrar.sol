pragma solidity ^0.5.3;

import "../rns/AbstractRNS.sol";
import "../resolvers/NameResolver.sol";

contract ReverseRegistrar {
    // namehash('addr.reverse')
    bytes32 public constant ADDR_REVERSE_NODE = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;

    AbstractRNS public rns;

    /// @dev Constructor
    /// @param rnsAddr The address of the RNS registry.
    constructor(AbstractRNS rnsAddr) public {
        rns = rnsAddr;
    }

    /// @notice Sets the name record on that name to the specified name
    /// @dev Sets the resolver for the name hex(msg.sender).addr.reverse to a default resolver
    /// @param name The name to set for this address.
    /// @return The RNS node hash of the reverse record.
    function setName(string memory name) public returns (bytes32 node) {
        node = claim(address(this));
        NameResolver(rns.resolver(node)).setName(node, name);
    }

    /// @notice Transfer ownership of the name hex(msg.sender).addr.reverse
    /// @dev Allows the caller to specify an owner other than themselves.
    /// The resulting account has `name()` resolver.
    /// @param owner The address to set as the owner of the reverse record in RNS.
    /// @return The RNS node hash of the reverse record.
    function claim(address owner) public returns (bytes32 node) {
        bytes32 label = sha3HexAddress(msg.sender);
        rns.setSubnodeOwner(ADDR_REVERSE_NODE, label, owner);
        node = keccak256(abi.encodePacked(ADDR_REVERSE_NODE, label));
    }

    /// @notice Sets the resolver of the name hex(msg.sender).addr.reverse to the specified resolver
    /// @dev Transfer ownership of the name to the provided address.
    /// @param owner The address to set as the owner of the reverse record in RNS.
    /// @param resolver The address of the resolver to set; 0 to leave default.
    /// @return The RNS node hash of the reverse record.
    function claimWithResolver(address owner, address resolver) public returns (bytes32 node) {
        bytes32 label = sha3HexAddress(msg.sender);
        node = keccak256(abi.encodePacked(ADDR_REVERSE_NODE, label));

        if (rns.owner(node) != address(this))
            rns.setSubnodeOwner(ADDR_REVERSE_NODE, label, address(this));
        // registrar owns the node, with default resolver

        if (resolver != address(0x0) && resolver != rns.resolver(ADDR_REVERSE_NODE))
            rns.setResolver(node, resolver);
        // node has default resolver for 0x00 or resolver value

        if (owner != address(this))
            rns.setOwner(node, owner);
        // owner owns node
    }

    /// @dev Returns the node hash for a given account's reverse records.
    /// @param addr The address to hash
    /// @return The RNS node hash.
    function node(address addr) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(ADDR_REVERSE_NODE, sha3HexAddress(addr)));
    }

    /// @dev An optimised function to compute the sha3 of the lower-case
    /// hexadecimal representation of an Ethereum address.
    /// @param addr The address to hash
    /// @return The SHA3 hash of the lower-case hexadecimal encoding of the
    /// input address.
    function sha3HexAddress(address addr) private pure returns (bytes32 ret) {
        addr;
        ret; // Stop warning us about unused variables
        assembly {
            let lookup := 0x3031323334353637383961626364656600000000000000000000000000000000

            for { let i := 40 } gt(i, 0) { } {
                i := sub(i, 1)
                mstore8(i, byte(and(addr, 0xf), lookup))
                addr := div(addr, 0x10)
                i := sub(i, 1)
                mstore8(i, byte(and(addr, 0xf), lookup))
                addr := div(addr, 0x10)
            }

            ret := keccak256(0, 40)
        }
    }
}
