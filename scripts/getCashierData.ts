import {Address, OpenedContract} from 'ton-core';
import {NetworkProvider, UIProvider} from '@ton-community/blueprint';
import {Cashier} from "../wrappers/Cashier";

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const minterAddr = Address.parse(args.length > 0 ? args[0] : await ui.input('Cashier address'));

    const cashier = provider.open(Cashier.createFromAddress(minterAddr));

    const [vaultAddr, betMinterAddr, govMinterAddr, govAddr,] = await cashier.getAddresses();
    ui.write(`Addresses: {Vault: ${vaultAddr}\nBET Minter: ${betMinterAddr}\nGOV Minter: ${govMinterAddr}\nGov: ${govAddr}`);

    const [tonSupply, betSupply, govSupply] = await cashier.getSupplies();
    ui.write(`\nSupplies: {TON: ${tonSupply}, BET: ${betSupply}, GOV: ${govSupply}}\n\n`);

    await showFee(ui, cashier, "BET Buy", "bet_buy_fee");
    await showFee(ui, cashier, "BET Sell", "bet_sell_fee");
    await showFee(ui, cashier, "GOV Buy", "gov_buy_fee");
    await showFee(ui, cashier, "GOV Sell", "gov_sell_fee");

}

async function showFee(ui: UIProvider, cashier: OpenedContract<Cashier>, name: string, key: string) {
    let {value, step} = await cashier.getFee(key);
    ui.write(`${name}: {value: ${value / 10_000}, step: ${step / 10_000}}`);
}
