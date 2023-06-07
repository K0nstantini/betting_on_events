import {Address, OpenedContract, toNano} from 'ton-core';
import {NetworkProvider} from '@ton-community/blueprint';
import {deployCashier, deployMinter, deployVault, getCashierAddresses} from "./deployAll";
import {Vault} from "../wrappers/Vault";
import {Cashier} from "../wrappers/Cashier";
import {JettonMinter} from "../wrappers/Minter";
import {JettonWallet} from "../wrappers/Wallet";

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();
    const depositAmount = toNano(args.length > 0 ? args[0] : await ui.input('Deposit ton amount'));

    const sender = provider.sender();
    const senderAddr = sender.address as Address;
    const sleep = (seconds: number) => new Promise(r => setTimeout(r, seconds * 1000));
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

    const betWalletAddr = await betMinter.getWalletAddress(senderAddr);
    const betWallet = provider.open(JettonWallet.createFromAddress(betWalletAddr));
    // const govWalletAddr = await govMinter.getWalletAddress(senderAddr);
    // const govWallet = provider.open(JettonWallet.createFromAddress(govWalletAddr));

    await vault.sendChangeOwner(sender, cashier.address);
    await sleep(30);
    await betMinter.sendChangeOwner(sender, cashier.address);
    await sleep(30);
    await govMinter.sendChangeOwner(sender, cashier.address);
    await sleep(30);

    console.log(` ========= Buy BET ========= `)
    const balancesStart = await getBalances(vault, cashier, betMinter, null);

    await vault.sendDeposit(provider.sender(), depositAmount);
    await sleep(60);
    const balancesEnd = await getBalances(vault, cashier, betMinter, betWallet);

    showContractData('VAULT', balancesStart.vault, balancesEnd.vault, depositAmount, toNano('0.045'));
    showContractData('CASHIER', balancesStart.cashier, balancesEnd.cashier, toNano('0.045'), toNano('0.03'));
    showContractData('BET MINTER', balancesStart.cashier, balancesEnd.cashier, toNano('0.03'), toNano('0.01'));
    showContractData('BET WALLET', balancesStart.cashier, balancesEnd.cashier, toNano('0.01'), toNano('0'));

}

function showContractData(contractName: string, startBalance: bigint, endBalance: bigint, inValue: bigint, outValue: bigint) {
    const gas_consuming = startBalance - endBalance + inValue - outValue;
    const addedValue = endBalance - startBalance;

    const startStr = `start: ${getBalance(startBalance)}`;
    const inStr = `in: ${getBalance(inValue)}`;
    const outStr = `out: ${getBalance(outValue)}`;
    const endStr = `end: ${getBalance(endBalance)}`;
    const addedStr = `added: ${getBalance(addedValue)}`;
    const gasStr = `gas ${getBalance(gas_consuming)}`;

    console.log(`${contractName}: {${startStr}, ${inStr}, ${outStr}, ${endStr}, ${addedStr}, ${gasStr}}`);
}

function getBalance(balance: bigint) {
    return (Number(balance) / 1_000_000_000).toPrecision(3);
}

async function getBalances(vault: OpenedContract<Vault>,
                           cashier: OpenedContract<Cashier>,
                           betMinter: OpenedContract<JettonMinter>,
                           betWallet: OpenedContract<JettonWallet> | null) {
    const {balance: vaultBalance} = await vault.getData();
    const cashierBalance = await cashier.getBalance();
    const betMinterBalance = await betMinter.getBalance();
    const betWalletBalance = betWallet ? await betWallet.getBalance() : BigInt(0);
    return {
        vault: vaultBalance,
        cashier: cashierBalance,
        betMinter: betMinterBalance,
        betWallet: betWalletBalance
    }
}