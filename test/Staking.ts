import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Signer, Contract } from 'ethers';
import { 
    AWCstakingV1__factory,
    AWCstakingV2__factory,
    TestToken, 
    TestToken__factory,
    RewardPoolV1__factory,
    RewardPoolV2__factory
} from "../typechain-types";



describe('AWCStakingContract',  () => {
    console.log("Test start...");
    let owner: Signer;
    let signer1: Signer;

    let staking: any; // Contract
    let AWC: TestToken;
    let pool: any; // Contract
    
    const percentsArr = 2000n;
    const rewardPerSecond = 6341958396n;

    beforeEach(async () => {
        [owner, signer1] = (await ethers.getSigners());
        let AWCFactory = (await ethers.getContractFactory("TestToken")) as TestToken__factory;
        AWC = (await AWCFactory.deploy(await owner.getAddress()));
        let poolFactory = (await ethers.getContractFactory("RewardPoolV1")) as RewardPoolV1__factory;
        pool = await upgrades.deployProxy(poolFactory, [await AWC.getAddress()], {
            initializer: "initialize",
        });
        let AWCstakingFactory = (await ethers.getContractFactory("AWCstakingV1")) as AWCstakingV1__factory;
        staking = await upgrades.deployProxy(AWCstakingFactory, [await AWC.getAddress(), percentsArr, await pool.getAddress()], {
            initializer: "initialize",
        });
        await AWC.mint(signer1, 100_000_000_000_000n, {from: owner});
        await AWC.mint(pool, 100_000_000_000_000n, {from: owner});
        await pool.grantRole(await pool.WITHDRAW_ROLE(), staking);
        await pool.grantRole(await pool.WITHDRAW_ROLE(), owner);
    });

    describe('Test token parameters', () => {
        it('should return correct name', async () => {
            const name = await AWC.name();
            expect(name).to.be.equal("Atomic Wallet Coin");
        });

        it('should return correct symbol', async () => {
            const symbol = await AWC.symbol();
            expect(symbol).to.be.equal('AWC');
        });

        it('should return correct decimals', async () => {
            const decimals = await AWC.decimals();
            expect(decimals).to.be.equal(8);
        });

        it('should return correct balances', async () => {
            let balance = await AWC.balanceOf(owner);
            expect(balance).to.be.equal(1000000000000n);
            balance = await AWC.balanceOf(signer1);
            expect(balance).to.be.equal(100000000000000n);
            balance = await AWC.balanceOf(await pool.getAddress());
            expect(balance).to.be.equal(100000000000000n);
        });
    });

    describe('Test contract params' , () => {
        it('should return correct token address', async () => {
            const tokenAddress = await staking.atomicToken();
            expect(tokenAddress).to.be.equal(await AWC.getAddress());
        });

        it('should return correct RewardPerSecond percents', async () => {
            const penaltyPercents = await staking.rewardPerSecond();
            expect(penaltyPercents).to.be.equal(rewardPerSecond);
        });

        it('should return correct avaible minStakeAmount', async () => {
            const minStakeAmount = await staking.minStakeAmount();
            expect(minStakeAmount).to.be.equal(5_000_000_000n);
        });
    });

    describe('Test creating deposit', () => {
        it('should open new deposit', async () => {
            await AWC.connect(signer1).approve(staking, 50_000_000_000n);

            await expect(staking.connect(signer1).stake(0)).to.be.revertedWith("deposit: amount is too low");
            const deposit = await staking.connect(signer1).stake(50_000_000_000n);

            const blockTime = await time.latest();

            expect(deposit).to.emit(staking, "Deposit").withArgs(await signer1.getAddress(), 50_000_000_000n);

            const { amount, lastRewardTime } = await staking.userInfo(signer1);

            expect(amount).to.be.equal(50_000_000_000n); 

            expect(lastRewardTime).to.be.equal(blockTime);
        });
        it('set minStakeAmount 5000 AWC', async () => {
            await AWC.connect(signer1).approve(staking, 50_000_000_000n);

            await staking.setMinStakeAmount(500_000_000_000n);

            await expect(staking.connect(signer1).stake(50_000_000_000n)).to.be.revertedWith("deposit: amount is too low");
        });
    });
    
    describe('Test withdraw rewards', () => {
        it('should stake correct rewards', async () => {
            await AWC.connect(signer1).approve(staking, 50_000_000_000n);
            await staking.connect(signer1).stake(50_000_000_000n);
            
            // increase time for 40 days
            await time.increase(time.duration.days(40));

            // uint256 pending = (user.amount.mul((block.timestamp.sub(user.lastRewardTime)).mul(AtomicPerSecond))).div(1e15);
            let rewards = await staking.getPendingReward(signer1);


            let BalanceBefore = await AWC.balanceOf(signer1);
            
            await staking.connect(signer1).claimReward();

            let BalanceAfter = await AWC.balanceOf(signer1);
            
            expect(BalanceAfter).to.be.closeTo(BalanceBefore + rewards, 500);
            
        });

        it('claim reward when the balance is less minStakeAmount', async() => {
            await AWC.connect(signer1).approve(staking, 5_000_000_000n);
            await staking.connect(signer1).stake(5_000_000_000n);

            await staking.setMinStakeAmount(500_000_000_000n);

            let BalanceBefore = await AWC.balanceOf(signer1);

            await time.increase(time.duration.days(365));

            let rewards = await staking.getPendingReward(signer1);

            await staking.connect(signer1).claimReward();

            let BalanceAfter = await AWC.balanceOf(signer1);

            expect(BalanceAfter).to.be.closeTo(BalanceBefore + rewards, 1000);

            let depositInfo = await staking.userInfo(signer1);

            expect(depositInfo.isRewardStake).to.be.equal(false);

            await staking.connect(signer1).unstake(999_999_999n);

            depositInfo = await staking.userInfo(signer1);

            BalanceBefore = await AWC.balanceOf(signer1);

            await staking.connect(signer1).claimReward();

            BalanceAfter = await AWC.balanceOf(signer1);

            expect(BalanceAfter).to.be.equal(BalanceBefore);

            expect(depositInfo.isRewardStake).to.be.equal(false);
            
            // increase time for 365 days 
        });

        it('should claim rewards with 20 percentage', async () => {
            await AWC.connect(signer1).approve(staking, 50_000_000_000n);
            await staking.connect(signer1).stake(50_000_000_000n);
            
            // increase time for 365 days
            await time.increase(time.duration.days(365));

            // uint256 pending = (user.amount.mul((block.timestamp.sub(user.lastRewardTime)).mul(AtomicPerSecond))).div(1e15);
            let rewards = await staking.getPendingReward(signer1);
            let expectRewards =  50_000_000_000n*2n/10n;

            expect(rewards).to.be.closeTo(expectRewards, 1000);


            let BalanceBefore = await AWC.balanceOf(signer1);

            let depositInfo = await staking.userInfo(signer1);
            
            await staking.connect(signer1).unstake(depositInfo.amount);

            let BalanceAfter = await AWC.balanceOf(signer1);
            
            expect(BalanceAfter).to.be.closeTo(BalanceBefore+ rewards, 1000);

            depositInfo = await staking.userInfo(signer1);

            expect(depositInfo.freezeAtomic).to.be.equal(50_000_000_000n);
        });
        it('change RewardPerSecond should claim rewards with 10 percentage', async () => {
            await AWC.connect(signer1).approve(staking, 50_000_000_000n);
            await staking.connect(signer1).stake(50_000_000_000n);
            
            // increase time for 365 days
            await time.increase(time.duration.days(365));

            // uint256 pending = (user.amount.mul((block.timestamp.sub(user.lastRewardTime)).mul(AtomicPerSecond))).div(1e15);
            
            let expectRewards =  50_000_000_000n/10n;

            let BalanceBefore = await AWC.balanceOf(signer1);

            await expect(staking.setRewardPerSecond(10001n)).to.be.revertedWith("setRewardPerSecond: percentReward is too high");

            await staking.setRewardPerSecond(1000n);
            let rewards = await staking.getPendingReward(signer1);
            expect(rewards).to.be.closeTo(expectRewards, 1000);

            let depositInfo = await staking.userInfo(signer1);
            
            await staking.connect(signer1).unstake(depositInfo.amount);

            let BalanceAfter = await AWC.balanceOf(signer1);
            
            expect(BalanceAfter).to.be.closeTo(BalanceBefore+ rewards, 1000);

            depositInfo = await staking.userInfo(signer1);

            expect(depositInfo.freezeAtomic).to.be.equal(50_000_000_000n);
        });

        it('empty rewardPool and replenishment rewardPool', async () => {
            await AWC.connect(signer1).approve(staking, 50_000_000_000n);
            await staking.connect(signer1).stake(50_000_000_000n);
            
            // increase time for 365 days
            await time.increase(time.duration.days(365));


            await pool.connect(owner).withdrawTokensPool(owner, 100000000000000n);
            
            const balance = await AWC.balanceOf(await pool.getAddress());

            expect(balance).to.be.equal(0);

            let rewards = await staking.getPendingReward(signer1);

            await staking.connect(signer1).unstake(1);

            let depositInfo = await staking.userInfo(signer1);

            expect(rewards).to.be.closeTo(depositInfo.debt, 1000);

            await time.increase(time.duration.days(365));    
            
            await AWC.transfer(await pool.getAddress(), 100000000000000n);

            rewards +=  await staking.getPendingReward(signer1);

            let BalanceBefore = await AWC.balanceOf(signer1);
            await staking.connect(signer1).unstake(1);    

            depositInfo = await staking.userInfo(signer1);

            expect(depositInfo.debt).to.be.equal(0);

            let BalanceAfter = await AWC.balanceOf(signer1);

            expect(BalanceAfter).to.be.closeTo(BalanceBefore + rewards, 1000);

        });
    });

    describe('Test restake', () => {
            it('should return user amount with rewards', async ()=> {
                await AWC.connect(signer1).approve(staking, 50_000_000_000n);
                await staking.connect(signer1).stake(50_000_000_000n);
                
                // increase time for 365 days
                await time.increase(time.duration.days(365));
    
                // uint256 pending = (user.amount.mul((block.timestamp.sub(user.lastRewardTime)).mul(AtomicPerSecond))).div(1e15);
                let rewards = await staking.getPendingReward(signer1);
    
    
                let BalanceBefore = (await staking.userInfo(signer1)).amount;
                
                await staking.connect(signer1).restake();
    
                let BalanceAfter = (await staking.userInfo(signer1)).amount;
                
                expect(BalanceAfter).to.be.closeTo(BalanceBefore+ rewards, 1000);
    
            })
    });

    describe('Test closing stake', () => {
        it('get Freeze Atomic', async () => {
            await AWC.connect(signer1).approve(staking, 50_000_000_000n);
            await staking.connect(signer1).stake(50_000_000_000n);

            let rewards = await staking.getPendingReward(signer1);

            let BalanceBefore = await AWC.balanceOf(signer1);

            let depositInfo = await staking.userInfo(signer1);
            
            await staking.connect(signer1).unstake(depositInfo.amount);

            depositInfo = await staking.userInfo(signer1);

            expect(depositInfo.freezeAtomic).to.be.equal(50_000_000_000n);

            expect(depositInfo.amount).to.be.equal(0);

            await expect(staking.connect(signer1).getFreezeAtomic()).to.be.revertedWith("getFreezeAtomic: freeze time not end");
            
            // increase time for 10 days
            await time.increase(time.duration.days(10));

            await staking.connect(signer1).getFreezeAtomic();

            let BalanceAfter = await AWC.balanceOf(signer1);

            expect(BalanceAfter).to.be.closeTo(BalanceBefore + 50_000_000_000n + rewards, 500);
        });
        it('empty rewardPool and get Freeze Atomic', async () => {
            await AWC.connect(signer1).approve(staking, 50_000_000_000n);
            await staking.connect(signer1).stake(50_000_000_000n);
            
            // increase time for 365 days
            await time.increase(time.duration.days(365));

            let BalanceBefore = await AWC.balanceOf(signer1);

            await pool.connect(owner).withdrawTokensPool(owner, 100000000000000n);
            
            const balance = await AWC.balanceOf(await pool.getAddress());

            expect(balance).to.be.equal(0);

            let rewards = await staking.getPendingReward(signer1);

            let depositInfo = await staking.userInfo(signer1);

            await staking.connect(signer1).unstake(depositInfo.amount);

            depositInfo = await staking.userInfo(signer1);

            expect(rewards).to.be.closeTo(depositInfo.debt, 1000);

            expect(depositInfo.freezeAtomic).to.be.equal(50_000_000_000n);

            expect(depositInfo.amount).to.be.equal(0);

            await expect(staking.connect(signer1).getFreezeAtomic()).to.be.revertedWith("getFreezeAtomic: freeze time not end");

            await time.increase(time.duration.days(10));

            await staking.connect(signer1).getFreezeAtomic();

            let BalanceAfter = await AWC.balanceOf(signer1);

            expect(BalanceAfter).to.be.closeTo(BalanceBefore + 50_000_000_000n, 500);

            await AWC.transfer(await pool.getAddress(), 100000000000000n);

            await staking.connect(signer1).getFreezeAtomic();

            depositInfo = await staking.userInfo(signer1);

            BalanceAfter = await AWC.balanceOf(signer1);

            expect(BalanceAfter).to.be.closeTo(BalanceBefore + 50_000_000_000n + rewards, 500);

            
            expect(depositInfo.debt).to.be.equal(0);

        });
        it('get Reward after unstake', async () => {
            await AWC.connect(signer1).approve(staking, 50_000_000_000n);
            await staking.connect(signer1).stake(50_000_000_000n);

            let BalanceBefore = await AWC.balanceOf(signer1);

            await staking.connect(signer1).unstake(25_000_000_000n);

            let depositInfo = await staking.userInfo(signer1);

            expect(depositInfo.freezeAtomic).to.be.equal(25_000_000_000n);

            expect(depositInfo.amount).to.be.equal(25_000_000_000n);
            
            // increase time for 365 days
            await time.increase(time.duration.days(365));
            let rewards = await staking.getPendingReward(signer1);
            await staking.connect(signer1).claimReward();

            let BalanceAfter = await AWC.balanceOf(signer1);

            expect(BalanceAfter).to.be.closeTo(BalanceBefore+ rewards, 1000);
        });
    });
    describe('Test upgradeable', () => {
        it('update  stake the contract with a new feature', async () => {
            await AWC.connect(signer1).approve(staking, 50_000_000_000n);
            await staking.connect(signer1).stake(50_000_000_000n);

            let rewards = await staking.getPendingReward(signer1);

            let BalanceBefore = await AWC.balanceOf(signer1);


            let AWCstakingV2Factory = (await ethers.getContractFactory("AWCstakingV2")) as AWCstakingV2__factory;

            let stakingV2: any = await upgrades.upgradeProxy(await staking.getAddress(), AWCstakingV2Factory);


            await stakingV2.connect(signer1).unstakeAll();

            let depositInfo = await stakingV2.userInfo(signer1);

            expect(depositInfo.freezeAtomic).to.be.equal(50_000_000_000n);

            expect(depositInfo.amount).to.be.equal(0);

            await expect(stakingV2.connect(signer1).getFreezeAtomic()).to.be.revertedWith("getFreezeAtomic: freeze time not end");

            // increase time for 10 days
            await time.increase(time.duration.days(10));

            await stakingV2.connect(signer1).getFreezeAtomic();

            let BalanceAfter = await AWC.balanceOf(signer1);

            expect(BalanceAfter).to.be.closeTo(BalanceBefore + 50_000_000_000n + rewards, 1000);

        });

        it('update  rewardPool the contract with a new feature', async () => {

            let rewardPoolV2 = (await ethers.getContractFactory("RewardPoolV2")) as RewardPoolV2__factory;

            let poolV2 = await upgrades.upgradeProxy(await pool.getAddress(), rewardPoolV2);


            expect(await poolV2.getRewardToken()).to.be.equals(await AWC.getAddress());

        })
    });
});