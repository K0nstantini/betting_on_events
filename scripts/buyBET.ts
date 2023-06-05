import {Address, toNano} from 'ton-core';
import {NetworkProvider} from '@ton-community/blueprint';
import {Vault} from "../wrappers/Vault";

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const vaultAddr = Address.parse(args.length > 0 ? args[0] : await ui.input('Vault address'));
    const amount = toNano(args.length > 0 ? args[0] : await ui.input('Ton amount'));

    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    await vault.sendDeposit(provider.sender(), amount);
}