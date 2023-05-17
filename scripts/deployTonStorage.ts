import {toNano} from 'ton-core';
import {compile, NetworkProvider} from '@ton-community/blueprint';
import {Blockchain} from "@ton-community/sandbox";
import {TonStorage} from "../wrappers/TonStorage";

export async function run(provider: NetworkProvider) {
    const tonStorage = provider.open(TonStorage.createFromConfig({
        address: await getAddress()
    }, await compile('TonStorage')));

    await tonStorage.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(tonStorage.address);

    // run methods on `exchange`
}

export async function getAddress() {
    let blockchain: Blockchain;
    blockchain = await Blockchain.create();

    const exchange = await blockchain.treasury("exchange");
    return exchange.address;

}
