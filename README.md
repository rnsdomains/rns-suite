<img src="/logo.png" alt="logo" height="200" />

# RNS Suite

Get the RNS smart contract suite running on your local environment.

```
git clone https://github.com/rnsdomains/rns-suite
cd rns-suite
npm install
npx truffle develop
truffle(develop)> migrate
```

## Add RNS Suite to your project migrations

1. Install `rns-suite` with npm

    ```
    npm i @rsksmart/rns-suite
    ```

2. Create `RNSImports.sol` contract in `./contracts` folder, to make Truffle compile all dependent contracts

    ```solidity
    pragma solidity ^0.5.0;

    import "@rsksmart/rns-suite/contracts/RNSImports.sol";

    contract RNSImports {
    }
    ```

3. Create `2_rns_suite.js` deployment script in `./migration` .

    ```js
    const rnsSuite = require('@rsksmart/rns-suite')(artifacts);

    module.exports = function(deployer, _, accounts) {
      deployer.then(async () => await rnsSuite(deployer, accounts));
    };
    ```

4. Migrate!

## Setup for development

Install dependencies:

```
npm install
```

Run the project:
```
npx truffle develop
```

## Disclaimer

This solution includes a migrations file that deploys the full suite of RNS in your local environment.

It also registers a name (`alice.rsk`) during the migration so you can start managing it from the beggining.

Find the whole architecture and documentation in our [RSK Developers Portal](https://developers.rsk.co/rif/rns/libs/smart-contracts)

