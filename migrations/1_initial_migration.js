const Migrations = artifacts.require("Migrations");
const deploy = require('../');

module.exports = function(deployer) {
  deployer.deploy(Migrations).then(() => deploy(web3.currentProvider, ['alice', 'bob', 'charlie'], ['david', 'eve', 'frank'], ['grace', 'heidi', 'ivan']));
};
