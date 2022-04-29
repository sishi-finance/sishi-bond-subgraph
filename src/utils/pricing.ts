import {
  ADDRESS_ZERO,
  BIG_DECIMAL_1E18,
  BIG_DECIMAL_1E6,
  BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  PANCAKESWAP_FACTORY_ADDRESS,
  BUSD_ADDRESS,
  WBNB_ADDRESS,
  BIG_INT_ZERO,
  BIG_INT_18,
} from './const'
import { convertTokenToDecimal } from '.'
import { Address, Bytes, BigDecimal, BigInt, log, ethereum } from '@graphprotocol/graph-ts'

import { Factory as FactoryContract } from "../../generated/StakingVault/Factory";
import { Pair as PairContract } from "../../generated/StakingVault/Pair";

export function getDecimals(address: Address): BigInt {
  let contract = PairContract.bind(address)

  // try types uint8 for decimals
  let decimalValue = 18

  let decimalResult = contract.try_decimals()

  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value
  }

  return BigInt.fromI32(decimalValue)
}

function getPairReserves(
  token: Address,
  tokenDecimals: BigInt,
  quoteToken: Address,
  quoteTokenDecimals: BigInt
): BigDecimal[] {
  let sorted = sortTokens(token, quoteToken);
  let pairAddress = getPairAddress(token, quoteToken)
  let pair = PairContract.bind(pairAddress)
  let reserves = pair.try_getReserves()
  if (reserves.reverted) {
    return [BIG_DECIMAL_ZERO, BIG_DECIMAL_ZERO]
  }
  let ret = new Array<BigDecimal>()
  if (sorted[0].toHexString() == token.toHexString()) {
    ret.push(convertTokenToDecimal(reserves.value.value0, tokenDecimals))
    ret.push(convertTokenToDecimal(reserves.value.value1, quoteTokenDecimals))
  } else {
    ret.push(convertTokenToDecimal(reserves.value.value1, tokenDecimals))
    ret.push(convertTokenToDecimal(reserves.value.value0, quoteTokenDecimals))
  }
  return ret;
}

// Returns the price of `token` in terms of `quoteToken`
function getTokenPrice(
  token: Address,
  tokenDecimals: BigInt,
  quoteToken: Address,
  quoteTokenDecimals: BigInt
): BigDecimal {
  if (token.equals(quoteToken)) {
    return BIG_DECIMAL_ONE;
  }
  let reserves = getPairReserves(token, tokenDecimals, quoteToken, quoteTokenDecimals);
  if (reserves[0].equals(BIG_DECIMAL_ZERO)) {
    return BIG_DECIMAL_ZERO
  }
  // Price of token is quoteReserves / tokenReserves
  return reserves[1].div(reserves[0]);
}

// Returns the price of ether in terms of USDT
function getEthPriceUsd(): BigDecimal {
  return getTokenPrice(
    WBNB_ADDRESS,
    BigInt.fromString('18'),
    BUSD_ADDRESS,
    BigInt.fromString('18')
  );
}

// Returns the price of USDT in terms of ether
function getUsdPriceEth(): BigDecimal {
  return getTokenPrice(
    BUSD_ADDRESS,
    BigInt.fromString('18'),
    WBNB_ADDRESS,
    BigInt.fromString('18')
  );
}

// Address, tokenDecimals: BigInt
function getTokenPriceUSD(token: Address, decimals: BigInt): BigDecimal {
  // Get the price of the token in terms of eth
  let tokenPriceEth = getTokenPrice(
    token,
    decimals,
    WBNB_ADDRESS,
    BigInt.fromString('18'),
  );
  let ethPriceUsd = getEthPriceUsd();
  return tokenPriceEth.times(ethPriceUsd);
}


export function getUSDRate(token: Address, decimals: BigInt): BigDecimal {
  log.info('Getting USD Rate for: {}', [token.toHexString()])
  let usdt = BIG_DECIMAL_ONE
  // Check if the token is a Uniswap pair

  let tokenAsPair = PairContract.bind(token)
  let reservesResult = tokenAsPair.try_getReserves()

  if (reservesResult.reverted) {
    return getTokenPriceUSD(token, decimals)
  } else {
    let totalSupply = tokenAsPair.totalSupply()
    if (totalSupply.equals(BIG_INT_ZERO)) {
      return BIG_DECIMAL_ZERO
    }
    let share = BIG_DECIMAL_ONE.div(totalSupply.toBigDecimal())

    let token0Amount = reservesResult.value.value0.toBigDecimal().times(share)

    let token1Amount = reservesResult.value.value1.toBigDecimal().times(share)

    let token0 = tokenAsPair.token0()
    let token1 = tokenAsPair.token1()
    let token0PriceUSD = getUSDRate(token0, getDecimals(token0))

    let token1PriceUSD = getUSDRate(token1, getDecimals(token1))

    let token0USD = token0Amount.times(token0PriceUSD)

    let token1USD = token1Amount.times(token1PriceUSD)

    return token0USD.plus(token1USD)
  }

  return usdt
}

function sortTokens(tokenA: Address, tokenB: Address): Address[] {
  let ret = new Array<Address>()
  let a = BigInt.fromUnsignedBytes(Bytes.fromHexString(tokenA.toHexString()).reverse() as Bytes)
  let b = BigInt.fromUnsignedBytes(Bytes.fromHexString(tokenB.toHexString()).reverse() as Bytes)
  if (a.lt(b)) {
    ret.push(tokenA)
    ret.push(tokenB)
  } else {
    ret.push(tokenB)
    ret.push(tokenA)
  }
  return ret
}

function getPairAddress(tokenA: Address, tokenB: Address): Address {
  let factory = FactoryContract.bind(PANCAKESWAP_FACTORY_ADDRESS)
  let sorted = sortTokens(tokenA, tokenB)
  let pairAddress = factory.getPair(sorted[0], sorted[1])

  return pairAddress
}

function getEthRate(token: Address): BigDecimal {
  let eth = BIG_DECIMAL_ONE

  if (token != WBNB_ADDRESS) {
    let address = getPairAddress(token, WBNB_ADDRESS)

    if (address == ADDRESS_ZERO) {
      log.info('Adress ZERO...', [])
      return BIG_DECIMAL_ZERO
    }

    let pair = PairContract.bind(address)

    let reserves = pair.getReserves()

    eth =
      pair.token0().equals(WBNB_ADDRESS)
        ? reserves.value0.toBigDecimal().times(BIG_DECIMAL_1E18).div(reserves.value1.toBigDecimal())
        : reserves.value1.toBigDecimal().times(BIG_DECIMAL_1E18).div(reserves.value0.toBigDecimal())

    return eth.div(BIG_DECIMAL_1E18)
  }

  return eth
}

