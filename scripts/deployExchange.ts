import {toNano, beginCell, Cell} from 'ton-core';
import {Exchange} from '../wrappers/Exchange';
import {compile, NetworkProvider} from '@ton-community/blueprint';
import {Addresses} from "../helpers/addresses";

export async function run(provider: NetworkProvider) {
    const exchange = provider.open(Exchange.createFromConfig({
        addresses: getAddresses(),
        supplies: getSupplies(),
        fees: getFees()
    }, await compile('Exchange')));

    await exchange.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(exchange.address);

    // run methods on `exchange`
}

export function getAddresses() {
    return beginCell()
        .storeAddress(Addresses.tonStorage)
        .storeAddress(Addresses.betMinter)
        .storeAddress(Addresses.govMinter)
        .storeAddress(Addresses.gov)
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
    return beginCell()
        .storeRef(getFee(1000)) // bet buy
        .storeRef(getFee(1000)) // bet sell
        .storeRef(getFee(1000)) // gov buy
        .storeRef(getFee(1000)) // gov sell
        .endCell();
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
