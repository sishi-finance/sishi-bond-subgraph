import { BIG_DECIMAL_ZERO, BIG_INT_ZERO, NULL_CALL_RESULT_VALUE } from './const'
import { Address, Bytes, BigDecimal, BigInt } from '@graphprotocol/graph-ts'

export function hexToDecimal(hexString: string, decimals: number): BigDecimal {
  let bytes = Bytes.fromHexString(hexString).reverse() as Bytes;
  let bi = BigInt.fromUnsignedBytes(bytes);
  let scale = BigInt.fromI32(10).pow(decimals as u8).toBigDecimal();
  return bi.divDecimal(scale)
}

export function joinHyphen(vals: string[]): string {
  let ret = vals[0];
  for (let i = 1; i < vals.length; i++) {
    ret = ret.concat('-').concat(vals[i]);
  }
  return ret;
}

export function convertTokenToDecimal(amount: BigInt, decimals: BigInt): BigDecimal {
  if (decimals == BIG_INT_ZERO) {
    return amount.toBigDecimal()
  }
  let scale = BigInt.fromI32(10).pow(decimals.toI32() as u8).toBigDecimal()
  return amount.toBigDecimal().div(scale)
}

export function convertEthToDecimal(eth: BigInt): BigDecimal {
  return convertTokenToDecimal(eth, BigInt.fromI32(18))
}

export function equalToZero(value: BigDecimal): boolean {
  return value.equals(BIG_DECIMAL_ZERO)
}

export function isNullEthValue(value: string): boolean {
  return value == '0x0000000000000000000000000000000000000000000000000000000000000001' || value == ''
}

export function pow(base: BigDecimal, exponent: number): BigDecimal {
  let result = base

  if (exponent == 0) {
    return BigDecimal.fromString('1')
  }

  for (let i = 2; i <= exponent; i++) {
    result = result.times(base)
  }

  return result
}
