<img src="/logo.png" alt="logo" height="200" />

# RIF Name Service Full Suite

This solution includes a migrations file that deploys the full suite of RNS in your local environment.

It also registers a name (`alice.rsk`) during the migration so you can start managing it from the beggining.

Find the whole architecture and documentation in our [RSK Developers Portal](https://developers.rsk.co/rif/rns/libs/smart-contracts)

## Prerequisites

- [Truffle](https://www.trufflesuite.com/) (^5.0.30)

## Setup

```
npm install
```

## Run

Go to `migrations/2_rns_full_suite.js` and replace `DEV_ADDRESS` with your address.

Note: if you will use this suite in a browser, we strongly recommend to use [Nifty](https://chrome.google.com/webstore/detail/nifty-wallet/jbdaocneiiinmjbjlgalhcelgbejmnid?hl=en) or [Metamask](https://metamask.io/) wallets. Both work as Google Chrome extensions.

```
truffle develop
```

Once the Truffle Console is running

```
truffle(development)> migrate
```

These instructions assume you are running the Truffle local blockchain with the default settings. If you are using another blockchain such as Ganache, just change the port in the `truffle-config.js` file.

## Import migrations from another truffle project

1. Install `rns-suite`

    ```
    npm i @rsksmart/rns-suite
    ```

2. Create `Dummy2.sol` contract to make Truffle compile dependent contracts.

    ```solidity
    pragma solidity ^0.5.0;

    import "@rsksmart/rns-suite/contracts/Dummy.sol";

    contract Dummy2 {
    }
    ```

3. Create `2_rns_suite.js` migration.

    ```js
    const rnsSuite = require('@rsksmart/rns-suite')(artifacts);

    module.exports = function(deployer, _, accounts) {
      deployer.then(async () => await rnsSuite(deployer, accounts));
    };
    ```

> `./sample` contains a new truffle project after setup.

Check by running:

```
truffle develop
truffle(develop)> migrate
```
