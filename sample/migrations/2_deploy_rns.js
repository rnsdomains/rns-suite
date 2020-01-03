const rnsSuite = require('@rsksmart/rns-suite')(artifacts);

module.exports = function(deployer, _, accounts) {
  deployer.then(async () => await rnsSuite(deployer, accounts));
};

