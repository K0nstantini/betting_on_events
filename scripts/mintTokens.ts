import {Address} from 'ton-core';
import {NetworkProvider} from '@ton-community/blueprint';
import {JettonMinter} from "../wrappers/Minter";

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const minterAddr = Address.parse(args.length > 0 ? args[0] : await ui.input('Minter address'));
    const toAddr = Address.parse(args.length > 0 ? args[0] : await ui.input('Destination address'));
    const amount = BigInt(args.length > 0 ? args[0] : await ui.input('Amount'));

    const jettonMinter = provider.open(JettonMinter.createFromAddress(minterAddr));

    await jettonMinter.sendMint(provider.sender(), {
        toAddress: toAddr,
        jettonAmount: amount
    });

    ui.write('Minted successfully!');
}