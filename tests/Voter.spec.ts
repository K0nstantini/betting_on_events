import {Blockchain, SandboxContract, TreasuryContract} from '@ton-community/sandbox';
import {Address, beginCell, Cell, Dictionary, toNano} from 'ton-core';
import '@ton-community/test-utils';
import {compile} from '@ton-community/blueprint';
import {SettingDirection, Voter} from "../wrappers/Voter";
import {crc32} from "../helpers/crc32";
import {Opcodes} from "../helpers/opcodes";


describe('Voter', () => {
    let code: Cell;
    let blockchain: Blockchain;
    let voter: SandboxContract<Voter>;
    let owner: SandboxContract<TreasuryContract>;
    let randomSender: SandboxContract<TreasuryContract>;
    let cashier: SandboxContract<TreasuryContract>;
    let wallet: SandboxContract<TreasuryContract>;
    let votesMinter: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        code = await compile('Voter');
    });

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        owner = await blockchain.treasury('owner');
        randomSender = await blockchain.treasury("random");
        cashier = await blockchain.treasury("cashier");
        wallet = await blockchain.treasury("wallet");
        votesMinter = await blockchain.treasury("votes_minter");

        voter = blockchain.openContract(Voter.createFromConfig({
            addresses: await getAddresses(cashier.address, wallet.address, votesMinter.address),
            pool: Dictionary.empty(Dictionary.Keys.BigInt(256), Dictionary.Values.Cell()),
            settings: getSettings(),
            govSupply: BigInt(10)
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

    it('should start a new vote', async () => {
        const opts = {
            target: cashier.address,
            name: "bet_buy_fee",
            newVote: true,
            direction: SettingDirection.Up
        };
        const votingResult = await voter.sendVoting(wallet.getSender(), 1, opts);

        expect(votingResult.transactions).toHaveTransaction({
            from: voter.address,
            to: cashier.address,
            op: Opcodes.checkSettingsFormat,
            success: true,
        });
    });

    it('should update gov supply', async () => {
        const update = await voter.sendUpdateGovSupply(cashier.getSender(), 20);

        expect(update.transactions).toHaveTransaction({
            from: cashier.address,
            to: voter.address,
            success: true,
        });

        const supply = await voter.getGovSupply();
        expect(supply).toEqual(BigInt(20));
    });

    it('should confirm setting from a target contract', async () => {
        const opts = {
            target: cashier.address,
            name: "bet_buy_fee",
            direction: SettingDirection.Down
        };
        const votingResult = await voter.sendConfirm(cashier.getSender(), 1, opts);

        expect(votingResult.transactions).toHaveTransaction({
            from: cashier.address,
            to: voter.address,
            op: Opcodes.confirm,
            success: true,
        });

        expect(votingResult.transactions).toHaveTransaction({
            from: voter.address,
            to: votesMinter.address,
            op: Opcodes.mint,
            success: true,
        });

        const data = await voter.getLot(cashier.address, "bet_buy_fee");
        expect(data).not.toBeNull();
    });

    it('should change own setting', async () => {
        const opts = {
            target: voter.address,
            name: "half_approve_wait",
            newVote: true,
            direction: SettingDirection.Up
        };
        const votingResult = await voter.sendVoting(wallet.getSender(), 5, opts);

        expect(votingResult.transactions).toHaveTransaction({
            from: voter.address,
            to: voter.address,
            op: Opcodes.checkSettingsFormat,
            success: true,
        });

        expect(votingResult.transactions).toHaveTransaction({
            from: voter.address,
            to: voter.address,
            op: Opcodes.confirm,
            success: true,
        });

        expect(votingResult.transactions).toHaveTransaction({
            from: voter.address,
            to: voter.address,
            op: Opcodes.changeSettings,
            success: true,
        });

    });

    it('should confirm setting from a target contract and finalize', async () => {
        const opts = {
            target: cashier.address,
            name: "bet_buy_fee",
            direction: SettingDirection.Down
        };
        const votingResult = await voter.sendConfirm(cashier.getSender(), 5, opts);

        expect(votingResult.transactions).toHaveTransaction({
            from: cashier.address,
            to: voter.address,
            op: Opcodes.confirm,
            success: true,
        });

        expect(votingResult.transactions).toHaveTransaction({
            from: voter.address,
            to: cashier.address,
            op: Opcodes.changeSettings,
            success: true,
        });

        expect(votingResult.transactions).toHaveTransaction({
            from: voter.address,
            to: votesMinter.address,
            op: Opcodes.mint,
            success: true,
        });

        const data = await voter.getLot(cashier.address, "bet_buy_fee");
        expect(data).toBeNull();
    });

    // it('should confirm setting format', async () => {
    //     const blockchain = await Blockchain.create();
    //     const voterContract = await blockchain.openContract(voter);
    //
    //     const check = await voter.sendConfirmSettingFormat(
    //         voterContract.getSender(),
    //         "half_approve_wait",
    //         1
    //     );
    //
    //     expect(check.transactions).toHaveTransaction({
    //         from: voter.address,
    //         to: voter.address,
    //         success: true,
    //     });
    // });

});

async function getAddresses(cashier: Address, wallet: Address, voteMinter: Address) {
    const addresses = Dictionary.empty(Dictionary.Keys.Uint(32), Dictionary.Values.Address());
    addresses.set(crc32("cashier"), cashier);
    addresses.set(crc32("wallet"), wallet);
    addresses.set(crc32("votes_minter"), voteMinter);
    return addresses;
}

function getSettings() {
    const settings = Dictionary.empty(Dictionary.Keys.Uint(32), Dictionary.Values.Cell());
    const step_instant_approve = crc32("instant_approve_step");
    settings.set(crc32("instant_approve"), getSet(50, 25, 75, step_instant_approve));
    settings.set(crc32("instant_approve_step"), getSet(1, 1, 30, step_instant_approve));

    const step_half_approve_wait = crc32("half_approve_wait_step");
    settings.set(crc32("half_approve_wait"), getSet(432_000, 72_000, 1_800_000, step_half_approve_wait));
    settings.set(crc32("half_approve_wait_step"), getSet(10, 1, 30, step_half_approve_wait));
    return settings;
}

function getSet(value: number, min: number, max: number, stepId: number): Cell {
    return beginCell()
        .storeInt(value, 32)
        .storeInt(min, 32)
        .storeInt(max, 32)
        .storeInt(stepId, 32)
        .endCell();
}
