import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'

/** ========= Numbers & Bytes ========= */

export let BIG_INT_18 = BigInt.fromI32(18)

export let ADDRESS_ZERO = Address.fromString('0x0000000000000000000000000000000000000000')

export let BIG_DECIMAL_1E18 = BigDecimal.fromString('1e18')

export let BIG_DECIMAL_1E6 = BigDecimal.fromString('1e6')

export let BIG_DECIMAL_ZERO = BigDecimal.fromString('0')

export let BIG_DECIMAL_ONE = BigDecimal.fromString('1')

export let BIG_INT_ONE = BigInt.fromI32(1)

export let BIG_INT_TWO = BigInt.fromI32(2)

export let BIG_INT_ONE_HUNDRED = BigInt.fromI32(100)

export let BIG_INT_ONE_DAY_SECONDS = BigInt.fromI32(86400)

export let BIG_INT_ONE_YEAR_SECONDS = BigInt.fromI32(31536000)

export let BIG_INT_ZERO = BigInt.fromI32(0)

export let NULL_CALL_RESULT_VALUE = '0x0000000000000000000000000000000000000000000000000000000000000001'

export let PANCAKESWAP_FACTORY_ADDRESS = Address.fromString("0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73");

export let BUSD_ADDRESS = Address.fromString("0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56");

export let WBNB_ADDRESS = Address.fromString("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c");

export let ADDRESS_DEAD = Address.fromString('0x000000000000000000000000000000000000DEAD')

export let ADDRESS_SISHI = Address.fromString('0x8E8538c75f273aB2dF6AdEEcD3622A9c314fcCf3')

export let ADDRESS_SISHI_BNB_LP = Address.fromString('0x8c7a5aaa69dd5e6d06596a3bf677037b599b8a88')

export let ADDRESS_SISHI_BNB_LP_BOND = Address.fromString('0x7EB12b2EDE8B1D6B085950Cc6d4bD7bBd2CbB74D')