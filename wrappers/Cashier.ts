import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    Sender,
    SendMode
} from 'ton-core';
import {Opcodes} from "../helpers/opcodes";
import {randomAddress} from "@ton-community/test-utils";
import {crc32} from "../helpers/crc32";

export type CashierConfig = {
    addresses: Cell,
    supplies: Cell,
    fees: Dictionary<number, Cell>
};

export function cashierConfigToCell(config: CashierConfig): Cell {
    return beginCell()
        .storeRef(config.addresses)
        .storeRef(config.supplies)
        .storeDict(config.fees)
        .endCell();
}

export enum ChangeSettingsDirection { Up, Down }

export enum SettingsTarget { Value, Step }

export class Cashier implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new Cashier(address);
    }

    static createFromConfig(config: CashierConfig, code: Cell, workchain = 0) {
        const data = cashierConfigToCell(config);
        const init = {code, data};
        return new Cashier(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendBuyBet(provider: ContractProvider, via: Sender, value: bigint, balance: bigint) {
        await provider.internal(via, {
            value: '0.03',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.depositTon, 32)
                .storeUint(Date.now(), 64)
                .storeAddress(randomAddress())
                .storeCoins(value)
                .storeCoins(balance)
                .endCell(),
        });
    }

    async sendSellBet(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value: '0.02',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.burnNotification, 32)
                .storeUint(Date.now(), 64)
                .storeAddress(randomAddress())
                .storeCoins(value)
                .storeUint(Opcodes.burnedBetForTon, 32)
                .endCell(),
        });
    }

    async sendBuyGov(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value: '0.02',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.burnNotification, 32)
                .storeUint(Date.now(), 64)
                .storeAddress(randomAddress())
                .storeCoins(value)
                .storeUint(Opcodes.burnedBetForGov, 32)
                .endCell(),
        });
    }

    async sendSellGov(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value: '0.02',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.burnNotification, 32)
                .storeUint(Date.now(), 64)
                .storeAddress(randomAddress())
                .storeCoins(value)
                .endCell(),
        });
    }

    async sendChangeFeeValue(provider: ContractProvider, via: Sender, name: string,
                             target: SettingsTarget, direction: ChangeSettingsDirection) {
        await provider.internal(via, {
            value: '0.02',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.changeSettings, 32)
                .storeUint(Date.now(), 64)
                .storeUint(crc32(name), 32)
                .storeRef(beginCell()
                    .storeUint(target, 1)
                    .storeUint(direction, 1)
                    .endCell()
                )
                .endCell(),
        });
    }


    async sendCheckSettingsFormat(provider: ContractProvider, via: Sender, name: string) {
        await provider.internal(via, {
            value: '0.02',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.checkSettingsFormat, 32)
                .storeUint(Date.now(), 64)
                .storeUint(crc32(name), 32)
                .storeRef(beginCell()
                    .storeUint(0, 1)
                    .storeUint(0, 1)
                    .endCell()
                )
                .endCell(),
        });
    }

    async getSupplies(provider: ContractProvider) {
        const result = await provider.get('get_cashier_data', []);
        result.stack.readCell();
        const supplies = result.stack.readCell();
        const ds = supplies.beginParse();
        return [ds.loadCoins(), ds.loadCoins(), ds.loadCoins()]
    }

    async getAddresses(provider: ContractProvider) {
        const result = await provider.get('get_cashier_data', []);
        let addresses = result.stack.readCell();
        let ds = addresses.beginParse();
        const vault = ds.loadAddress();
        const betMinter = ds.loadAddress();
        const govMinter = ds.loadAddress();
        addresses = ds.loadRef();
        ds = addresses.beginParse();
        const gov = ds.loadAddress();
        return [vault, betMinter, govMinter, gov];
    }

    async getFee(provider: ContractProvider, key: string) {
        const result = await provider.get('get_cashier_data', []);
        result.stack.readCell();
        result.stack.readCell();
        const fees = result.stack.readCell();
        const ds = fees.beginParse();
        const dic = ds.loadDictDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Cell());
        const fee = dic.get(crc32(key));
        if (!fee) throw 'Fee not found';
        const dsFee = fee?.beginParse();
        dsFee.skip(2);
        const value = dsFee?.loadInt(16);
        dsFee?.skip(32);
        const step = dsFee?.loadUint(14);
        return {
            value,
            step
        }
    }

    async getBalance(provider: ContractProvider) {
        const state = await provider.getState();
        return state.balance;
    }
}
