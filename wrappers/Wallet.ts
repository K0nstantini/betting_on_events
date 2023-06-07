import {Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode} from 'ton-core';
import {Opcodes} from "../helpers/opcodes";

export type JettonWalletConfig = {
    ownerAddress: Address;
    minterAddress: Address;
    walletCode: Cell;
};

export function jettonWalletConfigToCell(config: JettonWalletConfig): Cell {
    return beginCell()
        .storeCoins(0)
        .storeAddress(config.ownerAddress)
        .storeAddress(config.minterAddress)
        .storeRef(config.walletCode)
        .endCell();
}

export class JettonWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new JettonWallet(address);
    }

    static createFromConfig(config: JettonWalletConfig, code: Cell, workchain = 0) {
        const data = jettonWalletConfigToCell(config);
        const init = {code, data};
        return new JettonWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendTransfer(provider: ContractProvider, via: Sender,
                       opts: {
                           value: bigint;
                           toAddress: Address;
                           queryId: number;
                           fwdAmount: bigint;
                           jettonAmount: bigint;
                       }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0xf8a7ea5, 32)
                .storeUint(opts.queryId, 64)
                .storeCoins(opts.jettonAmount)
                .storeAddress(opts.toAddress)
                .storeAddress(via.address)
                .storeUint(0, 1)
                .storeCoins(opts.fwdAmount)
                .storeUint(0, 1)
                .endCell(),
        });
    }

    async sendBurnForTon(provider: ContractProvider, via: Sender, value: bigint, jettonAmount: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.burn, 32)
                .storeUint(Date.now(), 64)
                .storeCoins(jettonAmount)
                .storeUint(Opcodes.burnedBetForTon, 32)
                .endCell(),
        });
    }

    async sendBurnForGov(provider: ContractProvider, via: Sender, jettonAmount: bigint) {
        await provider.internal(via, {
            value: '0.12',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.burn, 32)
                .storeUint(Date.now(), 64)
                .storeCoins(jettonAmount)
                .storeUint(Opcodes.burnedBetForGov, 32)
                .endCell(),
        });
    }

    async getData(provider: ContractProvider) {
        const res = await provider.get("get_wallet_data", []);
        return {
            balance: res.stack.readBigNumber(),
            owner: res.stack.readAddress()
        };
    }
    async getBalance(provider: ContractProvider) {
        const state = await provider.getState();
        return state.balance;
    }
}