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

export type ExchangeConfig = {
    addresses: Cell,
    supplies: Cell,
    fees: Dictionary<number, Cell>
};

export function exchangeConfigToCell(config: ExchangeConfig): Cell {
    return beginCell()
        .storeRef(config.addresses)
        .storeRef(config.supplies)
        .storeDict(config.fees)
        .endCell();
}

export class Exchange implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new Exchange(address);
    }

    static createFromConfig(config: ExchangeConfig, code: Cell, workchain = 0) {
        const data = exchangeConfigToCell(config);
        const init = {code, data};
        return new Exchange(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendBuyBet(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value: '0.02',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.depositTon, 32)
                .storeUint(Date.now(),64)
                .storeAddress(randomAddress())
                .storeCoins(value)
                .endCell(),
        });
    }

    async sendSellBet(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value: '0.02',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.burnNotification, 32)
                .storeUint(Date.now(),64)
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
                .storeUint(Date.now(),64)
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
                .storeUint(Date.now(),64)
                .storeAddress(randomAddress())
                .storeCoins(value)
                .endCell(),
        });
    }

    async getSupplies(provider: ContractProvider) {
        const result = await provider.get('get_exchange_data', []);
        result.stack.readCell();
        const supplies = result.stack.readCell();
        const ds = supplies.beginParse();
        return [ds.loadCoins(), ds.loadCoins(), ds.loadCoins()]
    }

    async getAddresses(provider: ContractProvider) {
        const result = await provider.get('get_exchange_data', []);
        let addresses = result.stack.readCell();
        let ds = addresses.beginParse();
        const tonStorage = ds.loadAddress();
        const betMinter = ds.loadAddress();
        const govMinter = ds.loadAddress();
        addresses = ds.loadRef();
        ds = addresses.beginParse();
        const gov = ds.loadAddress();
        return [tonStorage, betMinter, govMinter, gov];
    }

    async getFees(provider: ContractProvider, key: number) {
        const result = await provider.get('get_exchange_data', []);
        result.stack.readCell();
        result.stack.readCell();
        const fees = result.stack.readCell();
        const ds = fees.beginParse();
        const dic = ds.loadDictDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Cell());
        const fee = dic.get(key);
        if (!fee) return null;
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
}
