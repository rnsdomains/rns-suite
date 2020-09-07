const figlet = require('figlet');
const chalk = require('chalk');
const Web3 = require('web3');
const namehash = require('eth-ens-namehash').hash;
const { promisify } = require('util');

const RNS = require('./build/contracts/RNS');

const PublicResolver = require('./build/contracts/PublicResolver');
const MultiChainResolver = require('./build/contracts/MultiChainResolver');

const NameResolver = require('./build/contracts/NameResolver');
const ReverseRegistrar = require('./build/contracts/ReverseRegistrar');
const ReverseSetup = require('./build/contracts/ReverseSetup');

const RIF = require('./build/contracts/ERC677');
const TokenRegistrar = require('./build/contracts/TokenRegistrar');

const RSKOwner = require('./build/contracts/RSKOwner');
const NamePrice = require('./build/contracts/NamePrice');
const BytesUtils = require('./build/contracts/BytesUtils');
const FIFSRegistrar = require('./build/contracts/FIFSRegistrar');
const FIFSAddrRegistrar = require('./build/contracts/FIFSAddrRegistrar');
const Renewer = require('./build/contracts/Renewer');

const ProxyFactory = require('./build/contracts/ProxyFactory');
const ProxyAdmin = require('./build/contracts/ProxyAdmin');
const ResolverV1 = require('./build/contracts/ResolverV1');
const { encodeCall } = require('@openzeppelin/upgrades');

function link(artifact, libName, libAddress) {
  console.log(chalk.cyan(`Linking ${libName} into ${artifact.contractName}`));

  const linkerRegex = new RegExp(`__${libName}_+`, "g");

  return Object.assign(
    artifact,
    { bytecode: artifact.bytecode.replace(linkerRegex, libAddress.replace("0x", "")) }
  );
}

async function executeTx(tx, options) {
  const gas = await tx.estimateGas();
  return new Promise((resolve, reject) => tx.send({ gas, ...options })
    .on('transactionHash', transactionHash => {
      console.log(chalk.cyan(`Tx hash: ${transactionHash}`));
    })
    .on('receipt', receipt => {
      console.log(chalk.greenBright(`Success!`));
      resolve(receipt)
    })
    .on('error', error => {
      reject(error)
    })
  );
}

/**
 * Deploy RNS suite locally and perform automatic registrations.
 * @param {string|Web3Provider} provider to deploy the contracts on
 * @param {string[]} registrations labels to be registered with the current registrar (don't append .rsk)
 * @param {string[]} auctionRegistrations labels to be registered with the previous registrar (auction) (don't append .rsk)
 */
async function main(provider, registrations, auctionRegistrations, registrationsWithAddr) {
  console.log(figlet.textSync('Deploying RNS'));
  console.log(chalk.italic('\nThis can take a while...\n\n'));

  const web3 = new Web3(provider);

  const [from] = await web3.eth.getAccounts();
  web3.eth.defaultAccount = from;

  async function deployContract(artifact, arguments) {
    console.log(chalk.bold(`Deploying ${artifact.contractName}`));

    const contract = new web3.eth.Contract(artifact.abi, {
      data: artifact.bytecode,
      from
    });

    const gas = await contract.deploy({ arguments }).estimateGas();

    return new Promise((resolve, reject) => contract.deploy({ arguments }).send({ gas })
        .on('error', (error) => {
          reject(error);
        })
        .on('transactionHash', (transactionHash) => {
          console.log(chalk.cyan(`Tx hash: ${transactionHash}`));
        })
        .on('receipt', (receipt) => {
          console.log(chalk.greenBright(`Success!`));
          console.log(`Contract address: ${receipt.contractAddress}`);
        })
        .then((newContractInstance) => {
          resolve(newContractInstance);
        })
    );
  }

  console.log(chalk.italic('The registry'));
  const rns = await deployContract(RNS);

  console.log()

  console.log(chalk.italic('The resolvers'));
  const publicResolver = await deployContract(PublicResolver, [rns.options.address]);
  const multiChainResolver = await deployContract(MultiChainResolver, [rns.options.address, publicResolver.options.address]);

  console.log(chalk.bold('Connecting default resolver (public)'));
  await executeTx(rns.methods.setDefaultResolver(publicResolver.options.address));

  console.log()

  console.log(chalk.italic('The reverse suite'));
  const nameResolver = await deployContract(NameResolver, [rns.options.address]);
  const reverseRegistrar = await deployContract(ReverseRegistrar, [rns.options.address]);
  const reverseSetup = await deployContract(
    ReverseSetup,
    [
      rns.options.address,
      nameResolver.options.address,
      reverseRegistrar.options.address,
      from
    ]
  );

  console.log(chalk.bold('Connecting reverse suite'));
  await executeTx(rns.methods.setSubnodeOwner('0x00', web3.utils.sha3('reverse'), reverseSetup.options.address));
  await executeTx(reverseSetup.methods.run());

  console.log()

  console.log(chalk.italic('The RIF Token'));
  const rif = await deployContract(
    RIF,
    [
      from,
      web3.utils.toBN('1000000000000000000000'),
      'RIF',
      'RIF',
      web3.utils.toBN('18')
    ]
  );

  console.log()

  console.log(chalk.italic('RSK auction registrar (legacy)'));
  const auctionRegistrar = await deployContract(
    TokenRegistrar,
    [rns.options.address, namehash('rsk'), rif.options.address]
  );

  console.log(chalk.bold('Connecting auction registrar'));
  await executeTx(rns.methods.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), auctionRegistrar.options.address));

  let registeredDomainsAuction;

  try {
    if(auctionRegistrations && auctionRegistrations.length) {
      console.log(chalk.bold('Registering domains with auction'));

      async function increaseTime (duration) {
        await promisify(web3.currentProvider.send.bind(web3.currentProvider))({
          jsonrpc: '2.0',
          method: 'evm_increaseTime',
          params: [duration],
          id: new Date().getTime(),
        });

        await promisify(web3.currentProvider.send.bind(web3.currentProvider))({
          jsonrpc: '2.0',
          method: 'evm_mine',
          id: new Date().getTime(),
        });
      }

      const oneToken = web3.utils.toBN('1000000000000000000');

      let labels = [];
      let domains = [];

      auctionRegistrations.forEach(name => {
        labels.push(web3.utils.sha3(name));
        domains.push(`${name}.rsk`)
      });

      await executeTx(auctionRegistrar.methods.startAuctions(labels));
      await executeTx(rif.methods.approve(auctionRegistrar.options.address, oneToken.mul(web3.utils.toBN(labels.length))));

      let allBids = [];

      for (let i = 0; i < labels.length; i += 1)
        allBids.push(
          auctionRegistrar.methods.shaBid(labels[i], from, oneToken, '0x00').call()
            .then(sealedBid => executeTx(auctionRegistrar.methods.newBid(sealedBid, oneToken)))
        );

      await Promise.all(allBids);

      await increaseTime(259200);

      let allReveals = [];

      for (let i = 0; i < labels.length; i += 1)
        allReveals.push(
          executeTx(auctionRegistrar.methods.unsealBid(labels[i], oneToken, '0x00'))
        );

      await Promise.all(allReveals);

      await increaseTime(172800);

      let allFinalizations = [];

      for (let i = 0; i < labels.length; i += 1)
        allFinalizations.push(
          executeTx(auctionRegistrar.methods.finalizeAuction(labels[i]))
        );

      await Promise.all(allFinalizations);

      /*
      This block is useful if you want to transfer domains to your Metamask :)

      let allTransfers = []

      for (let i = 0; i < labels.length; i += 1)
      allTransfers.push(
        executeTx(auctionRegistrar.methods.transfer(labels[i], 'PASTE YOUR ADDRESS'))
      );

      await Promise.all(allTransfers);
      */

      registeredDomainsAuction = domains;
    }
  } catch(error) {
    console.log(chalk.redBright('Error registering domains in auction!'))
    console.log(error)
  }

  console.log()

  console.log(chalk.italic('RSK Registrar suite'));
  const rskOwner = await deployContract(
    RSKOwner,
    [auctionRegistrar.options.address, rns.options.address, namehash('rsk')]
  );

  const namePrice = await deployContract(NamePrice);

  const bytesUtils = await deployContract(BytesUtils);
  const LinkedFIFSRegistrar = link(FIFSRegistrar, 'BytesUtils', bytesUtils.options.address);
  const LinkedFIFSAddrRegistrar = link(FIFSAddrRegistrar, 'BytesUtils', bytesUtils.options.address);
  const LinkedRenewer = link(Renewer, 'BytesUtils', bytesUtils.options.address);

  const fifsRegistrar = await deployContract(
    LinkedFIFSRegistrar,
    [rif.options.address, rskOwner.options.address, from, namePrice.options.address]
  )

  console.log(chalk.bold('Adding FIFS Registrar'));
  await executeTx(rskOwner.methods.addRegistrar(fifsRegistrar.options.address));

  const fifsAddrRegistrar = await deployContract(
    LinkedFIFSAddrRegistrar,
    [
      rif.options.address,
      rskOwner.options.address,
      from,
      namePrice.options.address,
      rns.options.address,
      namehash('rsk')

    ]
  )

  console.log(chalk.bold('Adding FIFS Addr Registrar'));
  await executeTx(rskOwner.methods.addRegistrar(fifsAddrRegistrar.options.address));

  const renewer = await deployContract(
    LinkedRenewer,
    [rif.options.address, rskOwner.options.address, from, namePrice.options.address]
  )

  console.log(chalk.bold('Adding FIFS Addr Registrar'));
  await executeTx(rskOwner.methods.addRenewer(renewer.options.address));


  console.log(chalk.bold('Connecting RSK Registrar suite'));
  await executeTx(rns.methods.setSubnodeOwner('0x00', web3.utils.sha3('rsk'), rskOwner.options.address));

  console.log();

  let registeredDomainsRSKRegistrar;

  if (
    (registrations && registrations.length) ||
    (registrationsWithAddr && registrationsWithAddr.length)
  ) {
    console.log(chalk.bold('Registering domains'));

    if(registrationsWithAddr && registrationsWithAddr.length)
      registrations = registrations.concat(registrationsWithAddr);

    let labels = [];
    let domains = [];

    registrations.forEach(name => {
      labels.push(web3.utils.sha3(name));
      domains.push(`${name}.rsk`)
    });

    await executeTx(rskOwner.methods.addRegistrar(from));

    let allRegistrations = [];

    for (let i = 0; i < labels.length; i += 1)
      allRegistrations.push(executeTx(rskOwner.methods.register(labels[i], from, web3.utils.toBN('99999999999999'))));

    await Promise.all(allRegistrations);

    registeredDomainsRSKRegistrar = domains;

    console.log(`Registered: ${domains}`);
    console.log();

    if (registrationsWithAddr && registrationsWithAddr.length) {
      console.log(chalk.bold('Setting addrs'));
      const allAddrs = [];

      for (let i = 0; i < registrationsWithAddr.length; i += 1)
        allAddrs.push(
          executeTx(publicResolver.methods.setAddr(namehash(`${registrationsWithAddr[i]}.rsk`), from))
        );

      await Promise.all(allAddrs);
      console.log(`Set addr for: ${domains}`);
      console.log();
    }
  }


  console.log(chalk.italic('Definitive resolver (proxy deployment)'));
  const proxyFactory = await deployContract(ProxyFactory);
  const proxyAdmin = await deployContract(ProxyAdmin);
  const resolverV1 = await deployContract(ResolverV1);

  console.log(chalk.bold('Creating instance'));

  const salt = '16';
  const data = encodeCall('initialize', ['address'], [rns.options.address]);

  await executeTx(proxyFactory.methods.deploy(salt, resolverV1.options.address, proxyAdmin.options.address, data));

  const deploymentAddress = await proxyFactory.methods.getDeploymentAddress(salt, from).call();

  const defintiveResolver = new web3.eth.Contract(ResolverV1.abi, deploymentAddress);

  console.log()

  console.log('Done! Summary:')

  console.log('|===============================|============================================|')
  console.log('| Contract                      | Address                                    |')
  console.log('|===============================|============================================|')
  console.log(`| RNS registry                  | ${rns.options.address} |`)
  console.log(`| Public resolver (legacy)      | ${publicResolver.options.address} |`)
  console.log(`| Multi-chain resolver (legacy) | ${multiChainResolver.options.address} |`)
  console.log(`| Name resolver                 | ${nameResolver.options.address} |`)
  console.log(`| Reverse registrar             | ${reverseRegistrar.options.address} |`)
  console.log(`| RIF token                     | ${rif.options.address} |`)
  console.log(`| Auction registrar (legacy)    | ${auctionRegistrar.options.address} |`)
  console.log(`| RSK owner                     | ${rskOwner.options.address} |`)
  console.log(`| Name price                    | ${namePrice.options.address} |`)
  console.log(`| Bytes utils                   | ${bytesUtils.options.address} |`)
  console.log(`| FIFS registrar                | ${fifsRegistrar.options.address} |`)
  console.log(`| FIFS addr registrar           | ${fifsAddrRegistrar.options.address} |`)
  console.log(`| Renewer                       | ${renewer.options.address} |`)
  console.log(`| Definitive resolver           | ${defintiveResolver.options.address} |`)
  console.log('|===============================|============================================|\n')

  if (registeredDomainsAuction)
    console.log(`Registered domains with the auction registrar(legacy): ${registeredDomainsAuction}`);

  if (!registeredDomainsAuction && auctionRegistrar)
    console.log(`${chalk.yellowBright('An error occurred registering domains with the auction.')} Ensure you can execute evm_increaseTime and evm_mine`);

  if (registeredDomainsRSKRegistrar)
    console.log(`Registered domains with the current registrar: ${registeredDomainsRSKRegistrar}`);

  if(registrationsWithAddr)
    console.log(`Set addr for: ${registrationsWithAddr}`);

  console.log()

  return {
    rns,
    publicResolver,
    multiChainResolver,
    nameResolver,
    reverseRegistrar,
    rif,
    auctionRegistrar,
    rskOwner,
    namePrice,
    bytesUtils,
    fifsRegistrar,
    fifsAddrRegistrar,
    renewer,
    defintiveResolver
  }
}

module.exports = main;
