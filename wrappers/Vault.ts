import {Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode,} from 'ton-core';
import {Opcodes} from "../helpers/opcodes";

export type CashierConfig = {
    address: Address,
};

export function vaultConfigToCell(config: CashierConfig): Cell {
    return beginCell()
        .storeAddress(config.address)
        .endCell();
}

export class Vault implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new Vault(address);
    }

    static createFromConfig(config: CashierConfig, code: Cell, workchain = 0) {
        const data = vaultConfigToCell(config);
        const init = {code, data};
        return new Vault(contractAddress(workchain, init), init);
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

    async sendChangeOwner(provider: ContractProvider, via: Sender, newOwner: Address) {
        await provider.internal(via, {
            value: '0.02',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.changeAddr, 32)
                .storeUint(Date.now(), 64)
                .storeAddress(newOwner)
                .endCell(),
        });
    }

    async getOwnerAddress(provider: ContractProvider) {
        const result = await provider.get('get_vault_data', []);
        return result.stack.readAddress();
    }
}
