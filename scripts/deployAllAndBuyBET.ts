import {Address, toNano} from 'ton-core';
import {NetworkProvider} from '@ton-community/blueprint';
import {deployCashier, deployMinter, deployVault, getCashierAddresses} from "./deployAll";

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();
    const depositAmount = toNano(args.length > 0 ? args[0] : await ui.input('Deposit ton amount'));

    const sender = provider.sender();
    const sleep = () => new Promise(r => setTimeout(r, 30_000));
    const attempts = 20;

    const vault = await deployVault(provider, attempts);
    const betMinter = await deployMinter(provider, attempts);
    const govMinter = await deployMinter(provider, attempts);

    const cashierAddress = getCashierAddresses(sender.address as Address,
        {
            vaultAddr: vault.address,
            betMinterAddr: betMinter.address,
            govMinterAddr: govMinter.address
        });
    const cashier = await deployCashier(provider, attempts, cashierAddress);

    await vault.sendChangeOwner(sender, cashier.address);
    await sleep();
    await betMinter.sendChangeOwner(sender, cashier.address);
    await sleep();
    await govMinter.sendChangeOwner(sender, cashier.address);
    await sleep();
    await vault.sendDeposit(provider.sender(), depositAmount);
}
