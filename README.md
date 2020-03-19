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

## Extra stuff

- It automatically registers `alice.rsk` in the auction registrar. This allows to test the registrar migration.
- You can set `DEV_ADDRESS` in `2_run_full_suite.js` to receive all RIF Tokens and `alcie.rsk` in your address. Useful when testing front end.

## Setup for development

Install dependencies:

```
npm install
```

Run the project:
```
npx truffle develop
```
