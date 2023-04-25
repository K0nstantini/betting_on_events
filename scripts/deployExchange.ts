import { toNano } from 'ton-core';
import { Exchange } from '../wrappers/Exchange';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const exchange = provider.open(Exchange.createFromConfig({}, await compile('Exchange')));

    await exchange.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(exchange.address);

    // run methods on `exchange`
}
