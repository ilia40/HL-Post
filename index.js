"use strict";
const {UsersContract} = require("./Users");
const {TransfersContract} = require("./Transfers");
const {PackagesContract} = require("./Package");

module.exports.PackagesContract = PackagesContract;
module.exports.TransfersContract = TransfersContract;
module.exports.UsersContract = UsersContract;
module.exports.contracts = [UsersContract, TransfersContract, PackagesContract];