import {Address} from 'ton-core';
import {NetworkProvider} from '@ton-community/blueprint';
import {JettonWallet} from "../wrappers/Wallet";

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const walletAddr = Address.parse(args.length > 0 ? args[0] : await ui.input('\nWallet address'));

    const wallet = provider.open(JettonWallet.createFromAddress(walletAddr));

    const {balance, owner} = await wallet.getData();
    ui.write(`Balance: ${balance}, owner: ${owner}`);
}
