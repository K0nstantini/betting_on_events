import {Address} from 'ton-core';
import {NetworkProvider} from '@ton-community/blueprint';
import {JettonMinter} from "../wrappers/Minter";

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const minterAddr = Address.parse(args.length > 0 ? args[0] : await ui.input('Minter address'));

    const minter = provider.open(JettonMinter.createFromAddress(minterAddr));
    const {supply, owner} = await minter.getMinterData();

    ui.write(`supply: ${supply}, owner: ${owner}`);
}
