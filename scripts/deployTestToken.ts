import { ethers, upgrades } from "hardhat";
import * as fs from 'fs';
import { Contract, Signer } from 'ethers';
import {
    AWCstakingV1__factory, RewardPoolV1__factory, 
    TestToken__factory,
    TestToken,
} from "../typechain-types";

async function main() {

  let owner: Signer;


  let AWC: TestToken;

  let file = JSON.parse(fs.readFileSync(`${__dirname}/deployAddress.json`, 'utf-8'));

  //need PRIVATE_KEY owner in env.
    owner = (await ethers.getSigners())[0];


    let ERC20Factory = (await ethers.getContractFactory("TestToken")) as TestToken__factory;
    AWC = await ERC20Factory.deploy(await owner.getAddress());

    file.AWC = await AWC.getAddress();  

  console.log(`address AWCstaking: ${file.AWC}`);
  fs.writeFileSync(`${__dirname}/deployAddress.json`, JSON.stringify(file, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
