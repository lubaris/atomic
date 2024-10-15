import { ethers, upgrades } from "hardhat";
import * as fs from 'fs';
import { Contract, Signer } from 'ethers';
import {
    RewardPoolV1__factory
} from "../typechain-types";

async function main() {

  let owner: Signer;

  let pool: Contract;


  let file = JSON.parse(fs.readFileSync(`${__dirname}/deployAddress.json`, 'utf-8'));

  console.log(file.AWC)
  //need PRIVATE_KEY owner in env.
  if(file.AWC) {
    owner = (await ethers.getSigners())[0];

    let poolFactory = (await ethers.getContractFactory("RewardPoolV1")) as RewardPoolV1__factory;
    pool = await upgrades.deployProxy(poolFactory, [file.AWC], {
      initializer: "initialize",
    });

    file.RewardPool = await pool.getAddress();
  }

  console.log(`address rewardPool: ${file.RewardPool}`);
  fs.writeFileSync(`${__dirname}/deployAddress.json`, JSON.stringify(file, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
