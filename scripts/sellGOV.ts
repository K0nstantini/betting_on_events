import {Address, toNano} from 'ton-core';
import {NetworkProvider} from '@ton-community/blueprint';
import {JettonWallet} from "../wrappers/Wallet";

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const walletAddr = Address.parse(args.length > 0 ? args[0] : await ui.input('GOV Wallet address'));
    const amount = BigInt(args.length > 0 ? args[0] : await ui.input('GOV amount'));

    const wallet = provider.open(JettonWallet.createFromAddress(walletAddr));
    await wallet.sendBurn(provider.sender(), amount);
}