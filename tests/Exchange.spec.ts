import {Blockchain, SandboxContract, TreasuryContract} from '@ton-community/sandbox';
import {Cell, toNano} from 'ton-core';
import {Exchange} from '../wrappers/Exchange';
import '@ton-community/test-utils';
import {compile} from '@ton-community/blueprint';
import {getAddresses, getFees, getSupplies} from "../scripts/deployExchange";
import {Opcodes} from "../helpers/opcodes";


describe('Exchange', () => {
    let code: Cell;
    let blockchain: Blockchain;
    let exchange: SandboxContract<Exchange>;
    let owner: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        code = await compile('Exchange');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        owner = await blockchain.treasury('owner');

        exchange = blockchain.openContract(Exchange.createFromConfig({
            addresses: await getAddresses(),
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

    it('should buy BET', async () => {
        const sender = await blockchain.treasury("ton_storage");
        const betMinter = await blockchain.treasury("bet_minter");
        const buyBetResult = await exchange.sendBuyBet(sender.getSender(), toNano(10));

        expect(buyBetResult.transactions).toHaveTransaction({
            from: sender.address,
            to: exchange.address,
            success: true,
        });

        expect(buyBetResult.transactions).toHaveTransaction({
            from: exchange.address,
            to: betMinter.address,
            op: Opcodes.mint,
            success: true,
        });

        const [tonSupply, betSupply, _] = await exchange.getSupplies();
        expect(tonSupply).toEqual(toNano(10));
        expect(betSupply).toEqual(toNano(9));
    });
});
