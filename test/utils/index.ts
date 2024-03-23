import { BigNumberish, Contract, utils } from 'ethers';
import { ethers } from 'hardhat';

export async function setupUsers<T extends { [contractName: string]: Contract }>(
    addresses: string[],
    contracts: T
): Promise<({ address: string } & T)[]> {
    const users: ({ address: string } & T)[] = [];
    for (const address of addresses) {
        users.push(await setupUser(address, contracts));
    }
    return users;
}

export async function setupUser<T extends { [contractName: string]: Contract }>(
    address: string,
    contracts: T
): Promise<{ address: string } & T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = { address };
    for (const key of Object.keys(contracts)) {
        user[key] = contracts[key].connect(await ethers.getSigner(address));
    }
    return user as { address: string } & T;
}

export async function updateTimestamp(ts: number) {
    await ethers.provider.send('evm_setNextBlockTimestamp', [ts]);
    await ethers.provider.send('evm_mine', []);
}

export async function getCurrentTimestamp() {
    return (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
}

export function getInterfaceId(contractInterface: utils.Interface) {
    let interfaceId: BigNumberish = ethers.constants.Zero;
    const functions: string[] = Object.keys(contractInterface.functions);
    for (let i = 0; i < functions.length; i++) {
        interfaceId = interfaceId.xor(contractInterface.getSighash(functions[i]));
    }
    return interfaceId;
}