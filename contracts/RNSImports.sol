pragma solidity ^0.5.3;

import "@rsksmart/rns-registry/contracts/RNS.sol";

import "@rsksmart/rns-resolver/contracts/legacy/PublicResolver.sol";
import "@rsksmart/rns-resolver/contracts/legacy/MultiChainResolver.sol";

import "@rsksmart/rns-reverse/contracts/ReverseSetup.sol";
import "@rsksmart/rns-reverse/contracts/ReverseRegistrar.sol";
import "@rsksmart/rns-reverse/contracts/NameResolver.sol";

import "@rsksmart/erc677/contracts/ERC677.sol";

import "@rsksmart/rns-auction-registrar/contracts/TokenRegistrar.sol";

import "@rsksmart/rns-rskregistrar/contracts/RSKOwner.sol";
import "@rsksmart/rns-rskregistrar/contracts/FIFSRegistrar.sol";
import "@rsksmart/rns-rskregistrar/contracts/FIFSAddrRegistrar.sol";
import "@rsksmart/rns-rskregistrar/contracts/Renewer.sol";
import "@rsksmart/rns-rskregistrar/contracts/NamePrice.sol";

import "@openzeppelin/upgrades/contracts/upgradeability/ProxyFactory.sol";
import "@openzeppelin/upgrades/contracts/upgradeability/ProxyAdmin.sol";
import "@rsksmart/rns-resolver/contracts/ResolverV1.sol";

contract RNSImports {
}
