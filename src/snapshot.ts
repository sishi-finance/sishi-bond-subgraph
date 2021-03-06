import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { DynamicBond } from "../generated/DynamicBond/DynamicBond";
import { BondContract, BondSnapshotRecord, DailySnappshot, DataRegistry, HourlySnappshot, Snapshot, StakeSnapshotRecord } from "../generated/schema";
import { StakingVault } from "../generated/StakingVault/StakingVault";
import { getBondPool, getBondRegistry, getToken } from "./share";
import { convertEthToDecimal, convertTokenToDecimal, joinHyphen } from "./utils";
import { ADDRESS_DEAD, ADDRESS_SISHI, ADDRESS_SISHI_BNB_LP, ADDRESS_SISHI_BNB_LP_BOND, BIG_INT_ONE_YEAR_SECONDS, BIG_INT_ZERO } from "./utils/const";
import { getDecimals, getUSDRate } from "./utils/pricing";
import { log } from '@graphprotocol/graph-ts'
import { DistributeReward, StakingDistributor } from "../generated/StakingVault/StakingDistributor";
import { ERC20 } from "../generated/DynamicBond/ERC20";



const LATEST_ID = "latest"
function getLatestSnapshot(): Snapshot {
  let snapshot = Snapshot.load(LATEST_ID);
  if (snapshot == null) {
    snapshot = new Snapshot(LATEST_ID)
    snapshot.timestamp = BigInt.fromString("0")
    snapshot.save()
  }
  return snapshot as Snapshot
}

function getSnapshot(timestamp: BigInt): Snapshot {
  let snapshotId = timestamp.toString();
  let snapshot = Snapshot.load(snapshotId);
  if (snapshot == null) {
    snapshot = new Snapshot(snapshotId)
    snapshot.timestamp = timestamp;
    snapshot.save()
  }
  return snapshot as Snapshot
}

function getBondSnapshot(id: string, contractId: string, snapshotId: string): BondSnapshotRecord {
  let snapshot = BondSnapshotRecord.load(id);
  if (snapshot == null) {
    snapshot = new BondSnapshotRecord(id)
    snapshot.contract = contractId;
    snapshot.snapshot = snapshotId
    snapshot.save()
  }
  return snapshot as BondSnapshotRecord
}

function getStakeSnapshot(id: string, contractId: string, snapshotId: string): StakeSnapshotRecord {
  let snapshot = StakeSnapshotRecord.load(id);
  if (snapshot == null) {
    snapshot = new StakeSnapshotRecord(id)
    snapshot.contract = contractId;
    snapshot.snapshot = snapshotId
    snapshot.save()
  }
  return snapshot as StakeSnapshotRecord
}

function getSISHIStaked(): BigDecimal {
  let registry = getBondRegistry()

  let allStakeValue = BigInt.fromI32(0)
  let SISHI = ERC20.bind(ADDRESS_SISHI)

  let stakeContracts = registry.stakes
  for (let i = 0; i < stakeContracts.length; i++) {
    allStakeValue = allStakeValue.plus(SISHI.balanceOf(Address.fromString(stakeContracts[i])))
  }

  return convertEthToDecimal(allStakeValue)

}

function getProtocalOwnedLiquid(): BigDecimal {
  let totalLiquid = convertEthToDecimal(ERC20.bind(ADDRESS_SISHI_BNB_LP).totalSupply())
  let ownedLiquid = convertEthToDecimal(DynamicBond.bind(ADDRESS_SISHI_BNB_LP_BOND).depositCumulated())

  return ownedLiquid.div(totalLiquid).times(BigDecimal.fromString("100"))
}


function getSISHICirc(): BigDecimal {
  let registry = getBondRegistry()

  let SISHI = ERC20.bind(ADDRESS_SISHI)

  let totalSupply = SISHI.totalSupply()

  let burned = SISHI.balanceOf(ADDRESS_DEAD)

  let allBondValue = BigInt.fromI32(0)

  let bondContracts = registry.bonds
  for (let i = 0; i < bondContracts.length; i++) {
    let contract = DynamicBond.bind(Address.fromString(bondContracts[i]))
    allBondValue = allBondValue.plus(contract.bondAvailable())
  }


  return convertEthToDecimal(totalSupply.minus(burned).minus(allBondValue))

}


function checkAndTakeStapshot(timestamp: BigInt): void {
  let latestSnapshot = getLatestSnapshot();

  let rounded = BigInt.fromI32(3600)
  let lastID = latestSnapshot.timestamp.div(rounded).times(rounded)
  let nextID = timestamp.div(rounded).times(rounded);

  latestSnapshot.circSupply = getSISHICirc()
  latestSnapshot.percentOfStaked = getSISHIStaked().div(latestSnapshot.circSupply).times(BigDecimal.fromString("100"))
  latestSnapshot.percentOfOwnLiquid = getProtocalOwnedLiquid();

  if (nextID > lastID) {
    let saveSnapshotTimestamp = lastID.gt(BIG_INT_ZERO) ? lastID : nextID.minus(rounded)
    let snapshot = getSnapshot(saveSnapshotTimestamp)
    let registry = getBondRegistry()
    // log.info("checkAndTakeStapshot", [])

    let bondContracts = registry.bonds
    for (let i = 0; i < bondContracts.length; i++) {
      let bondId = bondContracts[i]
      let latestRecord = BondSnapshotRecord.load(joinHyphen([bondId, LATEST_ID])) as BondSnapshotRecord
      if (latestRecord != null) {
        let recordToSave = getBondSnapshot(joinHyphen([latestRecord.contract, snapshot.id]), latestRecord.contract, snapshot.id)

        recordToSave.depositCummulated = latestRecord.depositCummulated;
        recordToSave.depositCummulatedUSD = latestRecord.depositCummulatedUSD;
        recordToSave.bondCummulated = latestRecord.bondCummulated;
        recordToSave.bondCummulated = latestRecord.bondCummulated;
        recordToSave.bondPrice = latestRecord.bondPrice;
        recordToSave.bondDiscount = latestRecord.bondDiscount;
        recordToSave.bondAvailable = latestRecord.bondAvailable;

        recordToSave.timestamp = saveSnapshotTimestamp;
        recordToSave.snapshot = snapshot.id;
        recordToSave.save()
      }
    }


    let stakesContracts = registry.stakes

    for (let i = 0; i < stakesContracts.length; i++) {
      let stakeId = stakesContracts[i]
      let latestRecord = StakeSnapshotRecord.load(joinHyphen([stakeId, LATEST_ID])) as StakeSnapshotRecord
      if (latestRecord != null) {
        let recordToSave = getStakeSnapshot(joinHyphen([latestRecord.contract, snapshot.id]), latestRecord.contract, snapshot.id)

        recordToSave.tvl = latestRecord.tvl;
        recordToSave.tvlUSD = latestRecord.tvlUSD;
        recordToSave.pendingReward = latestRecord.pendingReward;

        recordToSave.timestamp = saveSnapshotTimestamp;
        recordToSave.snapshot = snapshot.id;
        recordToSave.save()
      }
    }

    snapshot.circSupply = latestSnapshot.circSupply
    snapshot.percentOfStaked = latestSnapshot.percentOfStaked
    snapshot.percentOfOwnLiquid = latestSnapshot.percentOfOwnLiquid
    snapshot.save();

    let hourlySnapshot = new HourlySnappshot(saveSnapshotTimestamp.toString())
    hourlySnapshot.timestamp = saveSnapshotTimestamp;
    hourlySnapshot.snapshot = snapshot.id;
    hourlySnapshot.save()



    let dailyRounded = BigInt.fromI32(3600 * 24)
    let lastDailyID = latestSnapshot.timestamp.div(dailyRounded).times(dailyRounded)
    let nextDailyID = timestamp.div(dailyRounded).times(dailyRounded);

    if (nextDailyID > lastDailyID) {
      let saveSnapshotTimestamp = lastID.gt(BIG_INT_ZERO) ? lastDailyID : nextDailyID.minus(dailyRounded)
      let dailySnapshot = new DailySnappshot(saveSnapshotTimestamp.toString())

      dailySnapshot.timestamp = saveSnapshotTimestamp;
      dailySnapshot.snapshot = snapshot.id;
      dailySnapshot.save()
    }


  }



  latestSnapshot.timestamp = timestamp;
  latestSnapshot.save();
}



export function updateBondSnapshot(contract: Address, event: ethereum.Event, shouldTakeSnapshot: boolean): void {
  let latestSnapshot = getLatestSnapshot();
  let bondSnapshotId = joinHyphen([contract.toHex(), LATEST_ID])

  let iBond = DynamicBond.bind(contract);
  let depositToken = getToken(iBond.depositToken())
  let payoutToken = getToken(iBond.payoutToken())

  let bondSnapshot = getBondSnapshot(bondSnapshotId, contract.toHex(), LATEST_ID)

  bondSnapshot.depositCummulated = convertTokenToDecimal(iBond.depositCumulated(), BigInt.fromI32(depositToken.decimal));
  bondSnapshot.bondCummulated = convertEthToDecimal(iBond.bondCumulated());
  bondSnapshot.depositCummulatedUSD = bondSnapshot.depositCummulated.times(depositToken.price)
  bondSnapshot.timestamp = event.block.timestamp;
  bondSnapshot.bondPrice = convertEthToDecimal(iBond.currentBondPrice());
  bondSnapshot.bondAvailable = convertEthToDecimal(iBond.bondAvailable());
  bondSnapshot.bondDiscount = BigDecimal.fromString("1").minus(bondSnapshot.bondPrice.div(payoutToken.price));

  bondSnapshot.save()
  if (shouldTakeSnapshot) {
    checkAndTakeStapshot(event.block.timestamp);
  }
}

export function updateStakeSnapshot(contract: Address, event: ethereum.Event, shouldTakeSnapshot: boolean): void {
  let latestSnapshot = getLatestSnapshot();
  let stakeSnapshotId = joinHyphen([contract.toHex(), LATEST_ID])

  let iStake = StakingVault.bind(contract);
  let iDistribute = StakingDistributor.bind(iStake.REWARD_DISTRIBUTOR());


  let stakeSnapshot = getStakeSnapshot(stakeSnapshotId, contract.toHex(), LATEST_ID)
  let stakeToken = getToken(iStake.WANT_TOKEN())

  stakeSnapshot.tvl = convertEthToDecimal(iStake.balance())
  stakeSnapshot.tvlUSD = stakeSnapshot.tvl.times(stakeToken.price)
  stakeSnapshot.timestamp = event.block.timestamp;
  stakeSnapshot.pendingReward = convertEthToDecimal(iDistribute.getDistributeRewardForVault(contract));;

  stakeSnapshot.save()

  if (shouldTakeSnapshot) {
    checkAndTakeStapshot(event.block.timestamp);
  }

}

export function updateAll(event: ethereum.Event) : void {
  let registry = getBondRegistry()
  for (let i = 0; i < registry.bonds.length; i++) {
    let address = Address.fromString(registry.bonds[i]);
    updateBondSnapshot(address, event, false);
  }

  for (let i = 0; i < registry.stakes.length; i++) {
    let address = Address.fromString(registry.stakes[i]);
    updateStakeSnapshot(address, event, false);
  }

  checkAndTakeStapshot(event.block.timestamp);

}