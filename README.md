<p align="middle">
    <img src="https://www.rifos.org/assets/img/logo.svg" alt="logo" height="100" >
</p>
<h3 align="middle"><code>rns-suite</code></h3>
<p align="middle">
    Run RNS smart contract suite on your local environment
</p>

## Usage

Install the RNS suite in your project

```
npm i --save-dev @rsksmart/rns-suite
```

Deploy the suite running

```javascript
const RNSSuite = require('@rsksmart/rns-suite');
RNSSuite('http://localhost:8545', ['alice', 'bob', 'charlie'], ['david', 'eve', 'frank'], ['grace', 'heidi', 'ivan'])
```

1. The first array of names are for .rsk  domains to be registered with the current method.
2. The second array of names are for .rsk  domains to be registered with the legacy auction method.
3. The third array of names are for .rsk domains to be registered with the current method and also setting an address to it.

### Run from Truffle migrations

```javascript
const Migrations = artifacts.require("Migrations");
const RNSSuite = require('@rsksmart/rns-suite');

module.exports = function(deployer) {
  return deployer.deploy(Migrations).then(() =>
    RNSSuite(web3.currentProvider, [['alice', 'bob', 'charlie'], ['david', 'eve', 'frank'], ['grace', 'heidi', 'ivan'])
  )
};
```

## Run locally

You can run the suite as a Truffle project

```bash
git clone https://github.com/rnsdomains/rns-suite
cd rns-suite
npm install

npx truffle develop # starts truffle development blockchain
truffle(develop)> migrate # migrates in development

npx truffle migrate # migrates to :8545 by default
```

Create your custom `truffle-config.js` file to connect to other networks.

- `ganache-cli` default port accessible via `--network ganache`

This is enables you to operate with the service via command line. For example, you can get/set an address via:

```
truffle(develop)> PublicResolver.at('LOGGED PUBLIC RESOLVER ADDRESS').then(p => p.addr(require('eth-ens-namehash').hash('grace.rsk')))
'0x288B41F66832532AcA5762980EAC237760D8a138'
truffle(develop)> PublicResolver.at('LOGGED PUBLIC RESOLVER ADDRESS').then(p => p.setAddr(require('eth-ens-namehash').hash('grace.rsk'), '0x3e7764DF9B1E5E8bdE4fF2d5E59A46eECAE2A04c'))
{
  tx: '0xe7316c16cc1b44f0f16ce6055d8a61f3110945ca86990cffcd1b29688e2478f8',
  ...
```

## Troubleshot

If you have problems registering domains with the auction ensure you can execute `evm_increaseTime` and `evm_mine` RPC methods in your node.
