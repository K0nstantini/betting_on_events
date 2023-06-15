import {Address} from 'ton-core';
import {NetworkProvider} from '@ton-community/blueprint';
import {Vault} from "../wrappers/Vault";

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const voterAddr = Address.parse(args.length > 0 ? args[0] : await ui.input('Voter address'));

    const voter = provider.open(Vault.createFromAddress(voterAddr));
    const currentTime = await voter.getData();
    console.log(currentTime);
}