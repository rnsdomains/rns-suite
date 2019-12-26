<img src="/logo.png" alt="logo" height="200" />

# RIF Name Service Full Suite

Implementation for the RNS full suite of contracts.

This solution includes a migrations file that deploys the full suite of RNS in your local environment in the same way we did it in MainNet. 
It also registers a name (`alice.rsk`) during the migration so you can start managing it from the beggining.

Find the whole architecture and documentation in our [RSK Developers Portal](https://developers.rsk.co/rif/rns/)

## Prerequisites

- [Truffle](https://www.trufflesuite.com/) (^5.0.30)

## Setup

```
npm install
```

Then, go to `migrations/2_rns_full_suite.js` and replace the `DEV_ADDRESS` variable with your address. 

Note: if you will use this suite in a browser, we strongly recommend to use [Nifty](https://chrome.google.com/webstore/detail/nifty-wallet/jbdaocneiiinmjbjlgalhcelgbejmnid?hl=en) or [Metamask](https://metamask.io/) wallets. Both work as Google Chrome extensions. 

```
truffle develop
```

Once the Truffle Console is running
```
truffle(development)> migrate
```



