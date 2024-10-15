# Staking smart contract for Atomic Wallet


## Usage

- [Hardhat](https://github.com/nomiclabs/hardhat): compile and run the smart contracts on a local development network
- [TypeChain](https://github.com/ethereum-ts/TypeChain): generate TypeScript types for smart contracts
- [Ethers](https://github.com/ethers-io/ethers.js/): renowned Ethereum library and wallet implementation
### Pre Requisites

Before running any command, make sure to install dependencies:

```sh
npm install
```

### Compile

Compile the smart contracts with Hardhat:

```sh
npx hardhat compile
```
### Reqired  environment variables
```sh
PRIVATE_KEY
```
### Test

Run the tests:

```sh
npx hardhat test
```

### Deploy contract to network (requires Private Keys)

```
npx hardhat run --network <network> ./scripts/deployPool.ts
npx hardhat run --network <network> ./scripts/deployStaking.ts
npx hardhat run --network <network> ./scripts/scriptGrantRole.ts
```

### Validate a contract with etherscan (requires API key)

```
npx hardhat verify --network <network> <DEPLOYED_CONTRACT_ADDRESS> "Constructor argument 1"
```

## License

MIT

