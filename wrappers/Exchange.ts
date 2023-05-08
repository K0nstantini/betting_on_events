import {Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode} from 'ton-core';

export type ExchangeConfig = {
    addresses: Cell,
    supplies: Cell,
    fees: Cell
};

export function exchangeConfigToCell(config: ExchangeConfig): Cell {
    return beginCell()
        .storeRef(config.addresses)
        .storeRef(config.supplies)
        .storeRef(config.fees)
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
}
