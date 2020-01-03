const namehash = require('eth-ens-namehash').hash;
const utils = require('web3-utils');

module.exports = (artifacts) => {
  const RNS = artifacts.require('RNS');

  const PublicResolver = artifacts.require('PublicResolver');
  const MultiChainResolver = artifacts.require('MultiChainResolver');

  const NameResolver = artifacts.require('NameResolver');
  const ReverseRegistrar = artifacts.require('ReverseRegistrar');
  const ReverseSetup = artifacts.require('ReverseSetup');

  const RIF = artifacts.require('ERC677');
  const TokenRegistrar = artifacts.require('TokenRegistrar');

  const RSKOwner = artifacts.require('RSKOwner');
  const NamePrice = artifacts.require('NamePrice');
  const BytesUtils = artifacts.require('BytesUtils');
  const FIFSRegistrar = artifacts.require('FIFSRegistrar');
  const Renewer = artifacts.require('Renewer');


  return async (deployer, accounts) => {
    // Registry
    const rns = await deployer.deploy(RNS);

    // Resolvers
    const publicResolver = await deployer.deploy(PublicResolver, rns.address);

    await rns.setDefaultResolver(publicResolver.address);

    await deployer.deploy(MultiChainResolver, rns.address, publicResolver.address);

    // Reverse
    const nameResolver = await deployer.deploy(NameResolver, rns.address);

    const reverseRegistrar = await deployer.deploy(ReverseRegistrar, rns.address);

    const reverseSetup = await deployer.deploy(
      ReverseSetup,
      rns.address,
      nameResolver.address,
      reverseRegistrar.address,
      accounts[0]
    );

    await rns.setSubnodeOwner('0x00', utils.sha3('reverse'), reverseSetup.address);

    await reverseSetup.run();

    // RIF Token
    const rif = await deployer.deploy(RIF, accounts[0], utils.toBN('1000000000000000000000'), 'RIFOS', 'RIF', utils.toBN('18'));

    // Token Registrar
    const tokenRegistrar = await deployer.deploy(TokenRegistrar, rns.address, namehash('rsk'), rif.address);

    await rns.setSubnodeOwner('0x00', utils.sha3('rsk'), tokenRegistrar.address);

    // RSK Registrar
    const rskOwner = await deployer.deploy(RSKOwner, tokenRegistrar.address, rns.address, namehash('rsk'));

    await deployer.deploy(BytesUtils);

    await deployer.link(BytesUtils, FIFSRegistrar);

    const namePrice = await deployer.deploy(NamePrice);

    const fifsRegistrar = await deployer.deploy(FIFSRegistrar, rif.address, rskOwner.address, accounts[0], namePrice.address);

    await rskOwner.addRegistrar(fifsRegistrar.address);

    await deployer.link(BytesUtils, Renewer);

    const renewer = await deployer.deploy(Renewer, rif.address, rskOwner.address, accounts[0], namePrice.address);

    await rskOwner.addRenewer(renewer.address);

    await rns.setSubnodeOwner('0x00', utils.sha3('rsk'), rskOwner.address);
  };
};
