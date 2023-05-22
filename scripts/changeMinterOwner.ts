import {Address} from 'ton-core';
import {NetworkProvider} from '@ton-community/blueprint';
import {JettonMinter} from "../wrappers/Minter";

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const minterAddr = Address.parse(args.length > 0 ? args[0] : await ui.input('Minter address'));
    const ownerAddr = Address.parse(args.length > 0 ? args[0] : await ui.input('New owner address'));

    const minter = provider.open(JettonMinter.createFromAddress(minterAddr));
    await minter.sendChangeOwner(provider.sender(), ownerAddr);

    ui.write('Change owner successfully!');
}