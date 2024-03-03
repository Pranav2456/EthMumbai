# PawFi | Blockchain - Solidity Smart Contracts

<img alt="Solidity" src="https://img.shields.io/badge/Solidity-e6e6e6?style=for-the-badge&logo=solidity&logoColor=black"/>  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white"/>

<hr/>

## Prerequisites
- Git
- NodeJs
- yarn

## Getting Started

- Install dependencies

```sh
yarn
```

- Create `.env` file

```sh
cp .example.env .env
```

- Configure environment variables in `.env`

### Run Tests

```sh
yarn test
```

### Generate Coverage Report
```sh
yarn coverage
```

### Deploy to Testnet

```sh
# Ethereum
yarn deploy:sepolia <path-to-script>
```
Examples:
```sh
yarn deploy:sepolia ./scripts/01_deploy_token.ts

yarn deploy:sepolia ./scripts/02_deploy_staking.ts
```

### Deploy to Mainnet

```sh
# Ethereum
yarn deploy:mainnet <path-to-script>
```