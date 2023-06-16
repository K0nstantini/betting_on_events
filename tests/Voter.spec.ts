import {Blockchain, SandboxContract, TreasuryContract} from '@ton-community/sandbox';
import {beginCell, Cell, Dictionary, toNano} from 'ton-core';
import '@ton-community/test-utils';
import {compile} from '@ton-community/blueprint';
import {Voter} from "../wrappers/Voter";


describe('Voter', () => {
    let code: Cell;
    let blockchain: Blockchain;
    let voter: SandboxContract<Voter>;
    let owner: SandboxContract<TreasuryContract>;
    let randomSender: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        code = await compile('Voter');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        owner = await blockchain.treasury('owner');
        randomSender = await blockchain.treasury("random");

        voter = blockchain.openContract(Voter.createFromConfig({
            addresses: beginCell().endCell(),
            pool: Dictionary.empty(Dictionary.Keys.Uint(32), Dictionary.Values.Cell()),
            settings: Dictionary.empty(Dictionary.Keys.Uint(32), Dictionary.Values.Cell()),
            govSupply: BigInt(0)
        }, code));

        const deployer = await blockchain.treasury('deployer');

        const deployResult = await voter.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: voter.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and cashier are ready to use
    });

    it('test', async () => {

    });


});
