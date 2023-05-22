import {Address} from 'ton-core';
import {NetworkProvider} from '@ton-community/blueprint';
import {Vault} from "../wrappers/Vault";

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const vaultAddr = Address.parse(args.length > 0 ? args[0] : await ui.input('Vault address'));
    const ownerAddr = Address.parse(args.length > 0 ? args[0] : await ui.input('New owner address'));

    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    await vault.sendChangeOwner(provider.sender(), ownerAddr);

    ui.write('Change owner successfully!');
}