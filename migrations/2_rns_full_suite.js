const RNS = artifacts.require('RNS');
const RIF = artifacts.require('ERC677TokenContract');
const TokenRegistrar = artifacts.require('TokenRegistrar');
const RSKOwner = artifacts.require('RSKOwner');
const FIFSRegistrar = artifacts.require('FIFSRegistrar');
const NamePrice = artifacts.require('NamePrice');
const NameResolver = artifacts.require('NameResolver');
const ReverseRegistrar = artifacts.require('ReverseRegistrar');
const PublicResolver = artifacts.require('PublicResolver');
const BytesUtils = artifacts.require('BytesUtils');
const MultiChainResolver = artifacts.require('MultiChainResolver');

const namehash = require('eth-ens-namehash').hash;

module.exports = (deployer, network, accounts) => {
  const TLD = 'rsk';
  const TLD_NODE = {
    namehash: namehash(TLD),
    sha: web3.utils.sha3(TLD)
  }

  //owner of the domain registered during the migration
  const DEV_ADDRESS = 'YOUR_ADDRESS';
  
  //label to be registered using the old auction model registrar
  const AUCTION_LABEL = 'alice';

  return deployLocal(deployer, accounts, DEV_ADDRESS, AUCTION_LABEL, TLD_NODE);
}

function deployLocal(deployer, accounts, devAddress, auctionLabel, tldNode) {
  let rns, rif, tokenRegistrar, rskOwner;

  const SHA_LABEL = web3.utils.sha3(auctionLabel);
  const INITIAL_RIF_SUPPLY = web3.utils.toBN('100000000000000000000000'); // 100 RIF
  const AUCTION_RIF_AMOUNT = web3.utils.toBN('10000000000000000000000'); // 10 RIF
  const DEV_RIF_AMOUNT = web3.utils.toBN('50000000000000000000000'); // 50 RIF
  const POOL = accounts[1];
  const ROOT_OWNER = accounts[0];

  return deployer.deploy(RNS).then(_rns => {
    rns = _rns;
  })
  .then(() => {
    return deployer.deploy(RIF, ROOT_OWNER, INITIAL_RIF_SUPPLY);
  })
  .then(_rif => {
    rif = _rif;
    return rif.transfer(devAddress, DEV_RIF_AMOUNT);
  })

  // public and multichain resolvers 
  .then(() => {
    return deployer.deploy(PublicResolver, rns.address);
  })
  .then((publicResolver) => {
    return deployer.deploy(MultiChainResolver, rns.address, publicResolver.address);
  })
  .then((multiChainResolver) => {    
    return rns.setDefaultResolver(multiChainResolver.address);
  })

  // auction model registrar deployment
  .then(() => {
    return deployer.deploy(TokenRegistrar, rns.address, tldNode.namehash, rif.address);
  })
  .then(_tokenRegistrar => {
    tokenRegistrar = _tokenRegistrar;
  })
  .then(() => {
    return rns.setSubnodeOwner('0x00', tldNode.sha, tokenRegistrar.address);
  })

  // register name using auction model registrar
  .then(() => {
    return tokenRegistrar.startAuction(SHA_LABEL);
  })
  .then(() => {
    return rif.approve(tokenRegistrar.address, AUCTION_RIF_AMOUNT)
  })
  .then(() => {
    return tokenRegistrar.shaBid(SHA_LABEL, ROOT_OWNER, AUCTION_RIF_AMOUNT, '0x00');
  })
  .then(sealedBid => {
    return tokenRegistrar.newBid(sealedBid, AUCTION_RIF_AMOUNT);
  })
  .then(() => {
    return web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [259200], // 3 days
      id: 0,
    }, () => { });
  })
  .then(() => {
    return tokenRegistrar.unsealBid(SHA_LABEL, AUCTION_RIF_AMOUNT, '0x00')
  })
  .then(() => {
    return web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [172800], // 2 days
      id: 0,
    }, () => { });
  })
  .then(() => {
    return tokenRegistrar.finalizeAuction(SHA_LABEL)
  })
  .then(() => {
    return tokenRegistrar.transfer(SHA_LABEL, devAddress)
  })

  // rskOwner deployment
  .then(() => {
    return deployer.deploy(RSKOwner, tokenRegistrar.address, rns.address, tldNode.namehash);
  })

  // give tld ownership to RSKOwner
  .then(_rskOwner => {
    rskOwner = _rskOwner;
    return rns.setSubnodeOwner('0x00', tldNode.sha, rskOwner.address)
  })

  // fifs registrar and pricing contract deployment
  .then(() => {
    return deployer.deploy(BytesUtils);
  })
  .then(() => {
    return deployer.link(BytesUtils, FIFSRegistrar);
  })
  .then(() => {
    return deployer.deploy(NamePrice);
  })
  .then((namePrice) => {
    return deployer.deploy(FIFSRegistrar, rif.address, rskOwner.address, POOL, namePrice.address);
  })
  .then((registrar) => {
    return rskOwner.addRegistrar(registrar.address);
  })

  // reverse resolution
  .then(() => {
    return deployer.deploy(ReverseRegistrar, rns.address)
  })
  .then(_reverseRegistrar => {
    reverseRegistrar = _reverseRegistrar;
    return rns.setSubnodeOwner('0x00', web3.utils.sha3('reverse'), ROOT_OWNER);
  })
  .then(() => {
    return deployer.deploy(NameResolver, rns.address);
  })
  .then((nameResolver) => {      
    return rns.setResolver(namehash('reverse'), nameResolver.address);
  })
  .then(() => {
    return rns.setSubnodeOwner(namehash('reverse'), web3.utils.sha3('addr'), reverseRegistrar.address);
  });
}
