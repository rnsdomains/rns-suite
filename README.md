<img src="/logo.png" alt="logo" height="200" />

# RNS Suite

Get the RNS smart contract suite running on your local environment.

## Usage

Install the RNS suite in your project

```
npm i --save-dev @rsksmart/rns-suite
```

Deploy the suite running

```javascript
const RNSSuite = require('@rsksmart/rns-suite');
RNSSuite('http://localhost:8545', ['alice', 'bob', 'charlie'], ['david', 'eve', 'frank'])
```

### Run from Truffle migrations

```javascript
const Migrations = artifacts.require("Migrations");
const RNSSuite = require('@rsksmart/rns-suite');

module.exports = function(deployer) {
  return deployer.deploy(Migrations).then(() =>
    RNSSuite(web3.currentProvider, ['alice', 'bob', 'charlie'], ['david', 'eve', 'frank'])
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

## Troubleshot

If you have problems registering domains with the auction ensure you can execute `evm_increaseTime` and `evm_mine` RPC methods in your node.
