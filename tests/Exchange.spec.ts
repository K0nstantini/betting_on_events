import {Blockchain, SandboxContract, TreasuryContract} from '@ton-community/sandbox';
import {Cell, toNano} from 'ton-core';
import {Exchange} from '../wrappers/Exchange';
import '@ton-community/test-utils';
import {compile} from '@ton-community/blueprint';
import {KeyPair, mnemonicNew, mnemonicToPrivateKey} from "ton-crypto";
import {getAddresses, getFees, getSupplies} from "../scripts/deployExchange";

async function randomKp() {
    let mnemonics = await mnemonicNew();
    return mnemonicToPrivateKey(mnemonics);
}

describe('Exchange', () => {
    let code: Cell;
    let blockchain: Blockchain;
    let exchange: SandboxContract<Exchange>;
    let kp: KeyPair;
    let owner: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        code = await compile('Exchange');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        kp = await randomKp();
        owner = await blockchain.treasury('owner');

        exchange = blockchain.openContract(Exchange.createFromConfig({
            addresses: getAddresses(),
            supplies: getSupplies(),
            fees: getFees()
        }, code));

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
