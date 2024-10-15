import { ethers, upgrades } from "hardhat";
import * as fs from 'fs';
import { Contract, Signer } from 'ethers';
import {
    AWCstakingV1__factory, RewardPoolV1__factory, 
    ERC20__factory,
} from "../typechain-types";

async function main() {

  let owner: Signer;

  let staking: Contract;
  let pool: any;
  let AWC: any;
  const percentsArr = 2000n;


  let file = JSON.parse(fs.readFileSync(`${__dirname}/deployAddress.json`, 'utf-8'));

  console.log(file.AWC)
  //need PRIVATE_KEY owner in env.
  if(file.AWC) {
    owner = (await ethers.getSigners())[0];

    let poolFactory = (await ethers.getContractFactory("RewardPoolV1")) as RewardPoolV1__factory;
    pool = poolFactory.attach(file.RewardPool);

    let ERC20Factory = (await ethers.getContractFactory("ERC20")) as ERC20__factory;
    AWC = ERC20Factory.attach(file.AWC);
    
    let AWCstakingFactory = (await ethers.getContractFactory("AWCstakingV1")) as AWCstakingV1__factory;
    staking = await upgrades.deployProxy(AWCstakingFactory, [await AWC.getAddress(), percentsArr, await pool.getAddress()], {
        initializer: "initialize",
    });

    file.staking = await staking.getAddress();  
  }

  console.log(`address AWCstaking: ${file.staking}`);
  fs.writeFileSync(`${__dirname}/deployAddress.json`, JSON.stringify(file, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
