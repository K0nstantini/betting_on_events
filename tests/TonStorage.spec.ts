import {Blockchain, SandboxContract, TreasuryContract} from '@ton-community/sandbox';
import {Cell, toNano} from 'ton-core';
import '@ton-community/test-utils';
import {compile} from '@ton-community/blueprint';
import {TonStorage} from "../wrappers/TonStorage";
import {getAddress} from "../scripts/deployTonStorage";


describe('TonStorage', () => {
    let code: Cell;
    let blockchain: Blockchain;
    let tonStorage: SandboxContract<TonStorage>;
    let owner: SandboxContract<TreasuryContract>;
    let exchange: SandboxContract<TreasuryContract>;
    let randomSender: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        code = await compile('TonStorage');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        owner = await blockchain.treasury('owner');
        exchange = await blockchain.treasury("exchange");
        randomSender = await blockchain.treasury("random");

        tonStorage = blockchain.openContract(TonStorage.createFromConfig({
            address: await getAddress(),
        }, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await tonStorage.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tonStorage.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and exchange are ready to use
    });

    it('should Deposit', async () => {
        const depositResult = await tonStorage.sendDeposit(
            randomSender.getSender(), toNano(10)
        );

        expect(depositResult.transactions).toHaveTransaction({
            from: randomSender.address,
            to: tonStorage.address,
            success: true,
        });

        expect(depositResult.transactions).toHaveTransaction({
            from: tonStorage.address,
            to: exchange.address,
            success: true,
        });

    });

    it('should not allow to Deposit', async () => {
        const depositResult = await tonStorage.sendDeposit(
            randomSender.getSender(), 20000000n
        );

        expect(depositResult.transactions).toHaveTransaction({
            from: randomSender.address,
            to: tonStorage.address,
            success: false,
        });
    });

    it('should Withdraw', async () => {
        await tonStorage.sendDeposit(randomSender.getSender(), toNano(10));

        const withdrawResult = await tonStorage.sendWithdraw(
            exchange.getSender(), randomSender.address, toNano(5)
        );

        expect(withdrawResult.transactions).toHaveTransaction({
            from: exchange.address,
            to: tonStorage.address,
            success: true,
        });

        expect(withdrawResult.transactions).toHaveTransaction({
            from: tonStorage.address,
            to: randomSender.address,
            success: true,
        });

    });

    it('should not allow to Withdraw', async () => {
        const withdrawResult = await tonStorage.sendWithdraw(
            randomSender.getSender(), randomSender.address, toNano(10)
        );

        expect(withdrawResult.transactions).toHaveTransaction({
            from: randomSender.address,
            to: tonStorage.address,
            success: false,
        });
    });

});
