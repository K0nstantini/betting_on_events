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
            pool: Dictionary.empty(Dictionary.Keys.Uint(32), Dictionary.Values.Cell()),
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

    it('should take vote', async () => {
        const votingResult = await voter.sendVoting(
            wallet.getSender(),
            1,
            cashier.address,
            "bet_buy_fee",
            true,
            SettingDirection.Up
        );

        expect(votingResult.transactions).toHaveTransaction({
            from: voter.address,
            to: cashier.address,
            op: Opcodes.checkSettingsFormat,
            success: true,
        });
    });


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
    settings.set(crc32("instant_approve"), getSet(50, 25, 75, 1));
    settings.set(crc32("half_approve_wait"), getSet(120, 20, 500, 10));
    return settings;
}

function getSet(value: number, min: number, max: number, step: number): Cell {
    return beginCell()
        .storeUint(0, 2)
        .storeInt(value, 32)          // value
        .storeInt(min, 32)       // min
        .storeInt(max, 32)    // max
        .storeUint(step, 16)   // step
        .storeUint(1, 16)     // min step
        .storeUint(20, 16)   // max step
        .endCell();
}
