import {Address, beginCell, Cell, toNano} from 'ton-core';
import {compile, NetworkProvider} from '@ton-community/blueprint';
import {Vault} from "../wrappers/Vault";
import {randomSeed} from "../helpers/util";
import {JettonMinter} from "../wrappers/Minter";
import {Cashier} from "../wrappers/Cashier";
import {getFees, getSupplies} from "./deployCashier";

export async function run(provider: NetworkProvider) {

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
    // await sleep();

    await vault.sendChangeOwner(sender, cashier.address);
    await sleep();
    await betMinter.sendChangeOwner(sender, cashier.address);
    await sleep();
    await govMinter.sendChangeOwner(sender, cashier.address);
}

async function deployVault(provider: NetworkProvider, attempts: number) {
    const vault = provider.open(Vault.createFromConfig({
        address: provider.sender().address as Address,
        seed: beginCell().storeUint(randomSeed(), 256).endCell(),
    }, await compile('Vault')));

    await vault.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(vault.address, attempts);
    return vault;
}

async function deployMinter(provider: NetworkProvider, attempts: number) {
    const minter = provider.open(JettonMinter.createFromConfig({
        adminAddress: provider.sender().address as Address,
        content: beginCell().storeUint(randomSeed(), 256).endCell(),
        jettonWalletCode: await compile('Wallet')
    }, await compile('Minter')));

    await minter.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(minter.address, attempts);
    return minter;
}

async function deployCashier(provider: NetworkProvider, attempts: number, addresses: Cell) {
    const cashier = provider.open(Cashier.createFromConfig({
        addresses,
        supplies: getSupplies(),
        fees: getFees()
    }, await compile('Cashier')));

    await cashier.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(cashier.address, attempts);
    return cashier;
}

function getCashierAddresses(senderAddr: Address,
                             addresses: {
                                 vaultAddr: Address;
                                 betMinterAddr: Address;
                                 govMinterAddr: Address;
                             }) {
    return beginCell()
        .storeAddress(addresses.vaultAddr)
        .storeAddress(addresses.betMinterAddr)
        .storeAddress(addresses.govMinterAddr)
        .storeRef(beginCell().storeAddress(senderAddr))
        .endCell();
}