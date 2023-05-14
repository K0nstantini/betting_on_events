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
    let randomSender: SandboxContract<TreasuryContract>;
    let tonStorage: SandboxContract<TreasuryContract>;
    let betMinter: SandboxContract<TreasuryContract>;
    let govMinter: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        code = await compile('Exchange');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        owner = await blockchain.treasury('owner');
        tonStorage = await blockchain.treasury("ton_storage");
        betMinter = await blockchain.treasury("bet_minter");
        govMinter = await blockchain.treasury("gov_minter");
        randomSender = await blockchain.treasury("random");

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
        const buyBetResult = await exchange.sendBuyBet(tonStorage.getSender(), toNano(10));

        expect(buyBetResult.transactions).toHaveTransaction({
            from: tonStorage.address,
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
        expect(betSupply).toEqual(9_000n);
    });

    it('should not allow to buy BET', async () => {
        const buyBetResult = await exchange.sendBuyBet(randomSender.getSender(), toNano(10));

        expect(buyBetResult.transactions).toHaveTransaction({
            from: randomSender.address,
            to: exchange.address,
            success: false,
            exitCode: 100
        });
    });

    it('should sell BET', async () => {
        await exchange.sendBuyBet(tonStorage.getSender(), toNano(10));

        // const supplies = await exchange.getSupplies();
        // console.log(supplies);

        const sellBetResult = await exchange.sendSellBet(betMinter.getSender(), 8_000n);

        expect(sellBetResult.transactions).toHaveTransaction({
            from: betMinter.address,
            to: exchange.address,
            success: true,
        });

        expect(sellBetResult.transactions).toHaveTransaction({
            from: exchange.address,
            to: tonStorage.address,
            op: Opcodes.withdrawTon,
            success: true,
        });

        const [tonSupply, betSupply, _] = await exchange.getSupplies();
        expect(tonSupply).toEqual(toNano("2.4"));
        expect(betSupply).toEqual(1_000n);
    });


    it('should not allow to sell BET', async () => {
        const sellBetResult = await exchange.sendSellBet(randomSender.getSender(), 8_000n);

        expect(sellBetResult.transactions).toHaveTransaction({
            from: randomSender.address,
            to: exchange.address,
            success: false,
            exitCode: 100
        });
    });

    it('should buy GOV', async () => {
        await exchange.sendBuyBet(tonStorage.getSender(), toNano(10));

        let buyGovResult = await exchange.sendBuyGov(betMinter.getSender(), 5_000n);

        expect(buyGovResult.transactions).toHaveTransaction({
            from: betMinter.address,
            to: exchange.address,
            success: true,
        });

        expect(buyGovResult.transactions).toHaveTransaction({
            from: exchange.address,
            to: govMinter.address,
            op: Opcodes.mint,
            success: true,
        });

        let [tonSupply, betSupply, govSupply] = await exchange.getSupplies();
        expect(tonSupply).toEqual(toNano(10));
        expect(betSupply).toEqual(4_000n);
        expect(govSupply).toEqual(4n);

        buyGovResult = await exchange.sendBuyGov(betMinter.getSender(), 1_530n);

        expect(buyGovResult.transactions).toHaveTransaction({
            from: betMinter.address,
            to: exchange.address,
            success: true,
        });

        expect(buyGovResult.transactions).toHaveTransaction({
            from: exchange.address,
            to: govMinter.address,
            op: Opcodes.mint,
            success: true,
        });

         [tonSupply, betSupply, govSupply] = await exchange.getSupplies();
        expect(tonSupply).toEqual(toNano(10));
        expect(betSupply).toEqual(2_470n);
        expect(govSupply).toEqual(5n);
    });

    it('should not allow to buy GOV', async () => {
        const buyGOVResult = await exchange.sendBuyGov(randomSender.getSender(), 5_000n);

        expect(buyGOVResult.transactions).toHaveTransaction({
            from: randomSender.address,
            to: exchange.address,
            success: false,
            exitCode: 100
        });
    });

    it('should sell GOV', async () => {
        await exchange.sendBuyBet(tonStorage.getSender(), toNano(10));
        await exchange.sendBuyGov(betMinter.getSender(), 5_000n);
        const sellGovResult = await exchange.sendSellGov(govMinter.getSender(), 3n);

        expect(sellGovResult.transactions).toHaveTransaction({
            from: govMinter.address,
            to: exchange.address,
            success: true,
        });

        expect(sellGovResult.transactions).toHaveTransaction({
            from: exchange.address,
            to: betMinter.address,
            op: Opcodes.mint,
            success: true,
        });

        const [tonSupply, betSupply, govSupply] = await exchange.getSupplies();
        expect(tonSupply).toEqual(toNano(10));
        expect(betSupply).toEqual(8_455n);
        expect(govSupply).toEqual(1n);
    });
});
