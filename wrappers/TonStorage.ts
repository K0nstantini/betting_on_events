import {Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode,} from 'ton-core';
import {Opcodes} from "../helpers/opcodes";

export type ExchangeConfig = {
    address: Address,
};

export function tonStorageConfigToCell(config: ExchangeConfig): Cell {
    return beginCell()
        .storeAddress(config.address)
        .endCell();
}

export class TonStorage implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new TonStorage(address);
    }

    static createFromConfig(config: ExchangeConfig, code: Cell, workchain = 0) {
        const data = tonStorageConfigToCell(config);
        const init = {code, data};
        return new TonStorage(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeposit(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.depositTon, 32)
                .storeUint(Date.now(), 64)
                .endCell(),
        });
    }

    async sendWithdraw(provider: ContractProvider, via: Sender, to: Address, value: bigint) {
        await provider.internal(via, {
            value: '0.03',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.withdrawTon, 32)
                .storeUint(Date.now(), 64)
                .storeAddress(to)
                .storeCoins(value)
                .endCell(),
        });
    }

    async getExchangeAddress(provider: ContractProvider) {
        const result = await provider.get('get_ton_storage_data', []);
        return result.stack.readAddress();
    }
}
