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

export type VoterConfig = {
    addresses: Cell,
    pool: Dictionary<number, Cell>,
    govSupply: bigint
};

export function voteConfigToCell(config: VoterConfig): Cell {
    return beginCell()
        .storeRef(config.addresses)
        .storeDict(config.pool)
        .storeCoins(config.govSupply)
        .endCell();
}

export class Voter implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new Voter(address);
    }

    static createFromConfig(config: VoterConfig, code: Cell, workchain = 0) {
        const data = voteConfigToCell(config);
        const init = {code, data};
        return new Voter(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async getData(provider: ContractProvider) {
        const result = await provider.get('get_voter_data', []);
        return result.stack.readBigNumber();
    }

}
