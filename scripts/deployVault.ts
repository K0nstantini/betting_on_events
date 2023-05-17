import {toNano} from 'ton-core';
import {compile, NetworkProvider} from '@ton-community/blueprint';
import {Blockchain} from "@ton-community/sandbox";
import {Vault} from "../wrappers/Vault";

export async function run(provider: NetworkProvider) {
    const vault = provider.open(Vault.createFromConfig({
        address: await getAddress()
    }, await compile('Vault')));

    await vault.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(vault.address);

    // run methods on `exchange`
}

export async function getAddress() {
    let blockchain: Blockchain;
    blockchain = await Blockchain.create();

    const exchange = await blockchain.treasury("exchange");
    return exchange.address;

}
