import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
import { Exchange } from '../wrappers/Exchange';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';

describe('Exchange', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Exchange');
    });

    let blockchain: Blockchain;
    let exchange: SandboxContract<Exchange>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        exchange = blockchain.openContract(Exchange.createFromConfig({}, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await exchange.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: exchange.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and exchange are ready to use
    });
});
