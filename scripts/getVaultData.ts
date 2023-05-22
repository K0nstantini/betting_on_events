import {Address} from 'ton-core';
import {NetworkProvider} from '@ton-community/blueprint';
import {Vault} from "../wrappers/Vault";

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const vaultAddr = Address.parse(args.length > 0 ? args[0] : await ui.input('\nVault address'));

    const vault = provider.open(Vault.createFromAddress(vaultAddr));

    const {owner, balance} = await vault.getData();
    ui.write(`Balance: ${Number(balance) / 1_000_000_000}, owner: ${owner}`);

}
