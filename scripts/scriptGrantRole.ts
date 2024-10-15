import { ethers } from "hardhat";
import * as fs from 'fs';
import {  Signer } from 'ethers';
import {
    AWCstakingV1__factory, 
    RewardPoolV1__factory
} from "../typechain-types";

async function main() {

  let owner: Signer;

  let staking: any;
  let pool: any;


  let file = JSON.parse(fs.readFileSync(`${__dirname}/deployAddress.json`, 'utf-8'));

  console.log(file.AWC)
  //need PRIVATE_KEY owner in env.
  if(file.AWC) {
    owner = (await ethers.getSigners())[0];

    let poolFactory = (await ethers.getContractFactory("RewardPoolV1")) as RewardPoolV1__factory;
    pool = poolFactory.attach(file.RewardPool);

    let AWCstakingFactory = (await ethers.getContractFactory("AWCstakingV1")) as AWCstakingV1__factory;
    staking = AWCstakingFactory.attach(file.staking);

    await pool.grantRole(await pool.WITHDRAW_ROLE(), await staking.getAddress());

    file.RewardPool = await pool.getAddress();
    file.staking = await staking.getAddress();  
  }

  console.log(`address rewardPool: ${file.RewardPool}`);
  console.log(`address AWCstaking: ${file.staking}`);
  fs.writeFileSync(`${__dirname}/deployAddress.json`, JSON.stringify(file, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
