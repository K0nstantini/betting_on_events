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
    pool: Dictionary<bigint, Cell>,
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

    async sendVoting(provider: ContractProvider, via: Sender, amount: number,
                     opts: {
                         target: Address,
                         name: string,
                         newVote: boolean,
                         direction: SettingDirection
                     }
    ) {
        await provider.internal(via, {
            value: '0.05',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.voting, 32)
                .storeUint(Date.now(), 64)
                .storeAddress(randomAddress())
                .storeCoins(amount)
                .storeAddress(opts.target)
                .storeUint(crc32(opts.name), 32)
                .storeUint(opts.newVote ? 1 : 0, 1)
                .storeUint(opts.direction, 2)
                .endCell(),
        });
    }

    async sendConfirm(provider: ContractProvider, via: Sender, amount: number,
                      opts: {
                          target: Address,
                          name: string,
                          direction: SettingDirection
                      }
    ) {
        await provider.internal(via, {
            value: '0.05',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.confirm, 32)
                .storeUint(Date.now(), 64)
                .storeUint(crc32(opts.name), 32)
                .storeUint(1, 1)
                .storeAddress(randomAddress())
                .storeCoins(amount)
                .storeUint(opts.direction, 2)
                .endCell(),
        });
    }

    async sendUpdateGovSupply(provider: ContractProvider, via: Sender, amount: number) {
        await provider.internal(via, {
            value: '0.05',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.update, 32)
                .storeUint(Date.now(), 64)
                .storeCoins(amount)
                .endCell(),
        });
    }

    async sendConfirmSettingFormat(provider: ContractProvider, via: Sender, name: string, choice: number) {
        await provider.internal(via, {
            value: '0.05',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.checkSettingsFormat, 32)
                .storeUint(Date.now(), 64)
                .storeCoins(crc32(name))
                .storeUint(choice, 2)
                .endCell(),
        });
    }

    async getLot(provider: ContractProvider, target: Address, name: string) {
        const res = await provider.get('get_voter_data', []);
        res.stack.readCell();
        let poolCell;
        try {
            poolCell = res.stack.readCell();
        } catch {
            return null;
        }
        let ds = poolCell.beginParse();
        const pool = ds.loadDictDirect(Dictionary.Keys.BigInt(256), Dictionary.Values.Cell());
        const dc = beginCell().storeAddress(target).endCell();
        ds = dc.beginParse();
        ds.skip(11);
        const id = ds.loadIntBig(256) - BigInt(crc32(name));
        const lot = pool.get(id);
        if (!lot) return null;
        ds = lot.beginParse();
        ds.skip(11);
        ds.skip(256);
        ds.skip(32);
        return {
            consensus: ds.loadUint(2),
            preserve: ds.loadCoins(),
            increase: ds.loadCoins(),
            decrease: ds.loadCoins(),
            lastVoteTime: ds.loadUint(32),
            timeToFinalize: ds.loadUint(32),
        }
    }

    async getGovSupply(provider: ContractProvider) {
        const res = await provider.get('get_voter_data', []);
        res.stack.pop();
        res.stack.pop();
        res.stack.pop();
        return res.stack.readBigNumber();
    }

}
