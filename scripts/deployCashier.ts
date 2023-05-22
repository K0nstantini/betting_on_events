import {Address, beginCell, Cell, Dictionary, toNano} from 'ton-core';
import {Cashier} from '../wrappers/Cashier';
import {compile, NetworkProvider} from '@ton-community/blueprint';
import {Blockchain} from "@ton-community/sandbox";
import {crc32} from "../helpers/crc32";

export async function run(provider: NetworkProvider) {
    const cashier = provider.open(Cashier.createFromConfig({
        addresses: await getRealAddresses(provider.sender().address as Address),
        supplies: getSupplies(),
        fees: getFees()
    }, await compile('Cashier')));

    await cashier.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(cashier.address);

    // run methods on `cashier`
}

export async function getRealAddresses(senderAddr: Address) {
    const vault = Address.parse("EQBXeKk9F30TmfAIHwgB2aSxvunhczFJG6zVUOwpvtmSDU18");
    const betMinter = Address.parse("EQDku5f4Sz1yR951dkguNtRJvoKEyKiQPPu-TRTqbtv8MFFW");
    const govMinter = Address.parse("EQAHqhpFRBU1iT-uPumLC0-3j_qzP6W7ETeYYyICLAnznb0q");
    // cashier: EQBZ95DJ_gH-tCdeUHYrmCjK5mFWaf8vV_QHdktIEmpo13ON

    return beginCell()
        .storeAddress(vault)
        .storeAddress(betMinter)
        .storeAddress(govMinter)
        .storeRef(beginCell().storeAddress(senderAddr))
        .endCell();
}

export async function getAddressesForTesting() {
    let blockchain: Blockchain;
    blockchain = await Blockchain.create();

    const vault = await blockchain.treasury("vault");
    const betMinter = await blockchain.treasury("bet_minter");
    const govMinter = await blockchain.treasury("gov_minter");
    const gov = await blockchain.treasury("gov");

    return beginCell()
        .storeAddress(vault.address)
        .storeAddress(betMinter.address)
        .storeAddress(govMinter.address)
        .storeRef(beginCell().storeAddress(gov.address))
        .endCell();
}

export function getSupplies() {
    return beginCell()
        .storeCoins(0) // ton
        .storeCoins(0) // bet
        .storeCoins(0) // gov
        .endCell();
}

export function getFees() {
    const dict = Dictionary.empty(Dictionary.Keys.Uint(32), Dictionary.Values.Cell())
    dict.set(crc32("bet_buy_fee"), getFee(1000));
    dict.set(crc32("bet_sell_fee"), getFee(500));
    dict.set(crc32("gov_buy_fee"), getFee(200));
    dict.set(crc32("gov_sell_fee"), getFee(100));
    return dict;
}

function getFee(value: number): Cell {
    return beginCell()
        .storeUint(0, 2)
        .storeInt(value, 16)          // value
        .storeInt(0, 16)        // min
        .storeInt(2000, 16)    // max
        .storeUint(1000, 14)   // step
        .storeUint(100, 14)     // min step
        .storeUint(2000, 14)   // max step
        .endCell();
}
