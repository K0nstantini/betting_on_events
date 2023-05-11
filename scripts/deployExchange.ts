import {toNano, beginCell, Cell, Dictionary} from 'ton-core';
import {Exchange} from '../wrappers/Exchange';
import {compile, NetworkProvider} from '@ton-community/blueprint';
import {Blockchain} from "@ton-community/sandbox";
import {crc32} from "../helpers/crc32";

export async function run(provider: NetworkProvider) {
    const exchange = provider.open(Exchange.createFromConfig({
        addresses: await getAddresses(),
        supplies: getSupplies(),
        fees: getFees()
    }, await compile('Exchange')));

    await exchange.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(exchange.address);

    // run methods on `exchange`
}

export async function getAddresses() {
    let blockchain: Blockchain;
    blockchain = await Blockchain.create();

    const tonStorage = await blockchain.treasury("ton_storage");
    const betMinter = await blockchain.treasury("bet_minter");
    const govMinter = await blockchain.treasury("gov_minter");
    const gov = await blockchain.treasury("gov");

    return beginCell()
        .storeAddress(tonStorage.address)
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
    dict.set(crc32("gov_buy_fee"), getFee(100));
    return dict;
}

function getFee(value: number): Cell {
    return beginCell()
        .storeUint(0, 2)
        .storeInt(value, 16)          // value
        .storeInt(0, 16)        // min
        .storeInt(2_000, 16)    // max
        .storeUint(1_000, 14)   // step
        .storeUint(100, 14)     // min step
        .storeUint(2_000, 14)   // max step
        .endCell();
}
