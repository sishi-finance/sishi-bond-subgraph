import { BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
  DynamicBond,
  AdjustBondTerm,
  AdjustBondTermFinish,
  Bond,
  Claim,
  OwnershipTransferred,
  Paused,
  SetBondTerm,
  Unpaused,
} from "../generated/DynamicBond/DynamicBond"
import { BondRecord } from "../generated/schema"
import { getBondPool, getToken, getUser } from "./share"
import { updateBondSnapshot } from "./snapshot"
import { convertEthToDecimal, convertTokenToDecimal, joinHyphen } from "./utils"
import { BIG_INT_ONE } from "./utils/const"

export function handleAdjustBondTerm(event: AdjustBondTerm): void { }

export function handleAdjustBondTermFinish(event: AdjustBondTermFinish): void { }

export function handleBond(event: Bond): void {

  let entityId = joinHyphen([event.transaction.hash.toHex(), event.logIndex.toString()])

  let entity = new BondRecord(entityId)
  let bondPool = getBondPool(event.address);
  let dynamicBondContract = DynamicBond.bind(event.address);
  let inputToken = getToken(dynamicBondContract.depositToken())
  let payoutToken = getToken(dynamicBondContract.payoutToken())
  let user = getUser(event.transaction.from, event.block.timestamp)

  entity.user = user.id
  entity.tx = event.transaction.hash;
  entity.contract = bondPool.id;
  entity.timestamp = event.block.timestamp;

  entity.deposit = convertTokenToDecimal(event.params.depositAmount, BigInt.fromI32(inputToken.decimal));
  entity.depositUSD = convertTokenToDecimal(dynamicBondContract.getTokenValue(event.params.depositAmount), BigInt.fromI32(18));
  entity.payout = convertEthToDecimal(event.params.payoutAmount);
  entity.priceUSD = entity.depositUSD.div(entity.payout);
  entity.save()


  user.totalBondCount = user.totalBondCount.plus(BIG_INT_ONE);
  user.totalBondDepositUSD = user.totalBondDepositUSD.plus(entity.depositUSD);
  user.totalBondPayout = user.totalBondPayout.plus(entity.payout);
  user.save()

  bondPool.totalDeposit = bondPool.totalDeposit.plus(entity.deposit);
  bondPool.totalPayout = bondPool.totalDeposit.plus(entity.payout);
  bondPool.save()


  updateBondSnapshot(event.address, event);
}

export function handleClaim(event: Claim): void { }

export function handleOwnershipTransferred(event: OwnershipTransferred): void { }

export function handlePaused(event: Paused): void { }

export function handleSetBondTerm(event: SetBondTerm): void { }

export function handleUnpaused(event: Unpaused): void { }
