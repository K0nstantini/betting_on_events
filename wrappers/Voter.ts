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

export enum SettingDirection { Preserve, Up, Down }

export type VoterConfig = {
    addresses: Dictionary<number, Address>,
    pool: Dictionary<number, Cell>,
    settings: Dictionary<number, Cell>,
    govSupply: bigint
};

export function voteConfigToCell(config: VoterConfig): Cell {
    return beginCell()
        .storeDict(config.addresses)
        .storeDict(config.pool)
        .storeDict(config.settings)
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

    async sendVoting(provider: ContractProvider,
                     via: Sender,
                     amount: number,
                     target: Address,
                     name: string,
                     newVote: boolean,
                     direction: SettingDirection
    ) {
        await provider.internal(via, {
            value: '0.05',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.voting, 32)
                .storeUint(Date.now(), 64)
                .storeAddress(randomAddress())
                .storeCoins(amount)
                .storeAddress(target)
                .storeUint(crc32(name), 32)
                .storeUint(newVote ? 1 : 0, 1)
                .storeUint(direction, 2)
                .endCell(),
        });
    }

    async getData(provider: ContractProvider) {
        const result = await provider.get('get_voter_data', []);
        return result.stack.readBigNumber();
    }

}
