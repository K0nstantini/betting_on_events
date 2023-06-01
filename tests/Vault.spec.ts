import {Blockchain, SandboxContract, TreasuryContract} from '@ton-community/sandbox';
import {beginCell, Cell, toNano} from 'ton-core';
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
            seed: beginCell().endCell()
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
            randomSender.getSender(), toNano('0.45'), toNano('0.5')
        );

        expect(depositResult.transactions).toHaveTransaction({
            from: randomSender.address,
            to: vault.address,
            success: true,
        });

        expect(depositResult.transactions).toHaveTransaction({
            from: vault.address,
            to: cashier.address,
            value: toNano('0.035'),
            success: true,
        });

    });

    it('should return Deposit', async () => {
        console.log(`Vault: ${vault.address}`);
        console.log(`Cashier: ${cashier.address}`);
        console.log(`User wallet: ${randomSender.address}`);

        const depositReturnResult = await vault.sendBounceDeposit(
            cashier.getSender(), randomSender.address, toNano('0.1')
        );

        expect(depositReturnResult.transactions).toHaveTransaction({
            from: cashier.address,
            to: vault.address,
            inMessageBounced: true,
            success: false,
        });

        expect(depositReturnResult.transactions).toHaveTransaction({
            from: vault.address,
            to: randomSender.address,
            success: true,
        });
    });

    it('should not allow to Deposit', async () => {
        const depositResult = await vault.sendDeposit(
            randomSender.getSender(), 20000000n, 20000000n // fix
        );

        expect(depositResult.transactions).toHaveTransaction({
            from: randomSender.address,
            to: vault.address,
            success: false,
        });
    });

    it('should Withdraw', async () => {
        await vault.sendDeposit(randomSender.getSender(), toNano(10), toNano('10.05'));

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

    it('should change owner', async () => {
        const changeOwnerResult = await vault.sendChangeOwner(
            cashier.getSender(), randomSender.address
        );

        expect(changeOwnerResult.transactions).toHaveTransaction({
            from: cashier.address,
            to: vault.address,
            success: true,
        });

        const newOwner = await vault.getOwnerAddress();
        expect(newOwner).toEqualAddress(randomSender.address);

    });

    it('should not allow to change owner', async () => {
        const changeOwnerResult = await vault.sendChangeOwner(
            randomSender.getSender(), randomSender.address
        );

        expect(changeOwnerResult.transactions).toHaveTransaction({
            from: randomSender.address,
            to: vault.address,
            success: false,
        });
    });

});
