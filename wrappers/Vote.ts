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

export type VoteConfig = {
    addresses: Cell,
    pool: Dictionary<number, Cell>
};

export function voteConfigToCell(config: VoteConfig): Cell {
    return beginCell()
        .storeRef(config.addresses)
        .storeDict(config.pool)
        .endCell();
}

export class Vote implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new Vote(address);
    }

    static createFromConfig(config: VoteConfig, code: Cell, workchain = 0) {
        const data = voteConfigToCell(config);
        const init = {code, data};
        return new Vote(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

}
