const figlet = require('figlet');
const chalk = require('chalk');
const Web3 = require('web3');
const namehash = require('eth-ens-namehash').hash;

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

async function main(provider) {
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


  console.log('Done! Summary:')

  console.log('|============================|============================================|')
  console.log('| Contract                   | Address                                    |')
  console.log('|============================|============================================|')
  console.log(`| RNS registry               | ${rns.options.address} |`)
  console.log(`| Public resolver            | ${publicResolver.options.address} |`)
  console.log(`| Multi-chain resolver       | ${multiChainResolver.options.address} |`)
  console.log(`| Name resolver              | ${nameResolver.options.address} |`)
  console.log(`| Reverse registrar          | ${reverseRegistrar.options.address} |`)
  console.log(`| RIF token                  | ${rif.options.address} |`)
  console.log(`| Auction registrar (legacy) | ${auctionRegistrar.options.address} |`)
  console.log(`| RSK owner                  | ${rskOwner.options.address} |`)
  console.log(`| Name price                 | ${namePrice.options.address} |`)
  console.log(`| Bytes utils                | ${bytesUtils.options.address} |`)
  console.log(`| FIFS registrar             | ${fifsRegistrar.options.address} |`)
  console.log(`| FIFS addr registrar        | ${fifsAddrRegistrar.options.address} |`)
  console.log(`| Renewer                    | ${renewer.options.address} |`)
  console.log('|============================|============================================|\n')

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
  }
}

module.exports = main;
