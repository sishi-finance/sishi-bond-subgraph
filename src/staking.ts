import { BigInt } from "@graphprotocol/graph-ts"
import { StakeRecord } from "../generated/schema"
import {
  StakingVault,
  Approval,
  OwnershipTransferred,
  Paused,
  Stake,
  Transfer,
  Unpaused,
  Unstake
} from "../generated/StakingVault/StakingVault"
import { getBondStake, getUser } from "./share"
import { updateStakeSnapshot } from "./snapshot"
import { convertEthToDecimal, joinHyphen } from "./utils"
import { BIG_INT_ZERO } from "./utils/const"

export function handleApproval(event: Approval): void {}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handlePaused(event: Paused): void {}

export function handleStake(event: Stake): void {

  if(event.params.amount == BIG_INT_ZERO)
    return;

  let entityId = joinHyphen([event.transaction.hash.toHex(), event.logIndex.toString()])

  let entity = new StakeRecord(entityId)

  let user = getUser(event.transaction.from, event.block.timestamp);
  let stakePool = getBondStake(event.address);


  entity.tx = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.user = user.id;
  entity.contract = stakePool.id;
  entity.amount = convertEthToDecimal(event.params.amount);
  entity.action = "STAKE";

  entity.save()

  stakePool.totalStake = stakePool.totalStake.plus(entity.amount);
  stakePool.save();

  user.totalStake = user.totalStake.plus(entity.amount);
  user.save();

  updateStakeSnapshot(event.address, event, true);

}

export function handleUnstake(event: Unstake): void {
  let entityId = joinHyphen([event.transaction.hash.toHex(), event.logIndex.toString()])

  let entity = new StakeRecord(entityId)

  let user = getUser(event.transaction.from, event.block.timestamp);
  let stakePool = getBondStake(event.address);


  entity.tx = event.transaction.hash;
  entity.timestamp = event.block.timestamp;
  entity.user = user.id;
  entity.contract = stakePool.id;
  entity.amount = convertEthToDecimal(event.params.amount);
  entity.action = "UNSTAKE";
  entity.save()

  stakePool.totalUnstake = stakePool.totalUnstake.plus(entity.amount);
  stakePool.save();

  user.totalUnstake = user.totalUnstake.plus(entity.amount);
  user.save();

  updateStakeSnapshot(event.address, event, true);

}



export function handleTransfer(event: Transfer): void {}

export function handleUnpaused(event: Unpaused): void {}

