import {Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode} from 'ton-core';
import {TupleItemSlice} from 'ton-core/dist/tuple/tuple';

export type JettonMinterConfig = {
    adminAddress: Address;
    content: Cell;
    jettonWalletCode: Cell;
};

export function jettonMinterConfigToCell(config: JettonMinterConfig): Cell {
    return beginCell()
        .storeCoins(0)
        .storeAddress(config.adminAddress)
        .storeRef(config.content)
        .storeRef(config.jettonWalletCode)
        .endCell();
}

export class JettonMinter implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new JettonMinter(address);
    }

    static createFromConfig(config: JettonMinterConfig, code: Cell, workchain = 0) {
        const data = jettonMinterConfigToCell(config);
        const init = {code, data};
        return new JettonMinter(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMint(provider: ContractProvider, via: Sender,
                   opts: {
                       toAddress: Address;
                       jettonAmount: bigint;
                   }
    ) {
        await provider.internal(via, {
            value: '0.03',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(21, 32)
                .storeUint(Date.now(), 64)
                .storeAddress(opts.toAddress)
                .storeCoins(opts.jettonAmount)
                .endCell(),
        });
    }

    async sendChangeOwner(provider: ContractProvider, via: Sender, addr: Address) {
        await provider.internal(via, {
            value: '0.01',
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32)
                .storeUint(Date.now(), 64)
                .storeAddress(addr)
                .endCell(),
        });
    }

    async getMinterData(provider: ContractProvider) {
        const result = await provider.get('get_jetton_data', []);
        const supply = result.stack.readBigNumber();
        result.stack.skip();
        const owner = result.stack.readAddress();
        return {supply, owner};
    }

    async getWalletAddress(provider: ContractProvider, address: Address): Promise<Address> {
        const result = await provider.get('get_wallet_address', [
            {
                type: 'slice',
                cell: beginCell().storeAddress(address).endCell()
            } as TupleItemSlice
        ]);

        return result.stack.readAddress();
    }

}