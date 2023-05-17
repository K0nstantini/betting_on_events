import {Blockchain, SandboxContract, TreasuryContract} from '@ton-community/sandbox';
import {Cell, toNano} from 'ton-core';
import '@ton-community/test-utils';
import {compile} from '@ton-community/blueprint';
import {Vault} from "../wrappers/Vault";
import {getAddress} from "../scripts/deployVault";


describe('Vault', () => {
    let code: Cell;
    let blockchain: Blockchain;
    let vault: SandboxContract<Vault>;
    let owner: SandboxContract<TreasuryContract>;
    let cashier: SandboxContract<TreasuryContract>;
    let randomSender: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        code = await compile('Vault');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        owner = await blockchain.treasury('owner');
        cashier = await blockchain.treasury("cashier");
        randomSender = await blockchain.treasury("random");

        vault = blockchain.openContract(Vault.createFromConfig({
            address: await getAddress(),
        }, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await vault.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: vault.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and cashier are ready to use
    });

    it('should Deposit', async () => {
        const depositResult = await vault.sendDeposit(
            randomSender.getSender(), toNano(10)
        );

        expect(depositResult.transactions).toHaveTransaction({
            from: randomSender.address,
            to: vault.address,
            success: true,
        });

        expect(depositResult.transactions).toHaveTransaction({
            from: vault.address,
            to: cashier.address,
            success: true,
        });

    });

    it('should not allow to Deposit', async () => {
        const depositResult = await vault.sendDeposit(
            randomSender.getSender(), 20000000n
        );

        expect(depositResult.transactions).toHaveTransaction({
            from: randomSender.address,
            to: vault.address,
            success: false,
        });
    });

    it('should Withdraw', async () => {
        await vault.sendDeposit(randomSender.getSender(), toNano(10));

        const withdrawResult = await vault.sendWithdraw(
            cashier.getSender(), randomSender.address, toNano(5)
        );

        expect(withdrawResult.transactions).toHaveTransaction({
            from: cashier.address,
            to: vault.address,
            success: true,
        });

        expect(withdrawResult.transactions).toHaveTransaction({
            from: vault.address,
            to: randomSender.address,
            success: true,
        });

    });

    it('should not allow to Withdraw', async () => {
        const withdrawResult = await vault.sendWithdraw(
            randomSender.getSender(), randomSender.address, toNano(10)
        );

        expect(withdrawResult.transactions).toHaveTransaction({
            from: randomSender.address,
            to: vault.address,
            success: false,
        });
    });

});
