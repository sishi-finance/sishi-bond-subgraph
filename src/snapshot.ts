import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { DynamicBond } from "../generated/DynamicBond/DynamicBond";
import { BondContract, BondSnapshotRecord, DailySnappshot, DataRegistry, HourlySnappshot, Snapshot, StakeSnapshotRecord } from "../generated/schema";
import { StakingVault } from "../generated/StakingVault/StakingVault";
import { getBondPool, getBondRegistry, getToken } from "./share";
import { convertEthToDecimal, convertTokenToDecimal, joinHyphen } from "./utils";
import { BIG_INT_ZERO } from "./utils/const";
import { getDecimals, getUSDRate } from "./utils/pricing";
import { log } from '@graphprotocol/graph-ts'



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



function checkAndTakeStapshot(timestamp: BigInt): void {
  let latestSnapshot = getLatestSnapshot();

  let rounded = BigInt.fromI32(3600)
  let lastID = latestSnapshot.timestamp.div(rounded).times(rounded)
  let nextID = timestamp.div(rounded).times(rounded);

  if (nextID > lastID) {
    let saveSnapshotTimestamp = lastID.gt(BIG_INT_ZERO) ? lastID : nextID.minus(rounded)
    let snapshot = getSnapshot(saveSnapshotTimestamp)
    let registry = getBondRegistry()
    // log.info("checkAndTakeStapshot", [])

    let bondContracts = registry.bonds
    for (let i = 0; i < bondContracts.length; i++) {
      let bondId = bondContracts[i]
      let recordId = joinHyphen([bondId, latestSnapshot.id])
      let currentRecord = BondSnapshotRecord.load(recordId) as BondSnapshotRecord
      if(currentRecord != null) {
        let recordToSave = getBondSnapshot(joinHyphen([currentRecord.contract, snapshot.id]), currentRecord.contract, snapshot.id)

        recordToSave.merge([currentRecord])
        recordToSave.timestamp = saveSnapshotTimestamp;
        recordToSave.snapshot = snapshot.id;
        recordToSave.save()
      }
    }


    let stakesContracts = registry.stakes

    for (let i = 0; i < stakesContracts.length; i++) {
      let stakeId = stakesContracts[i]
      let recordId = joinHyphen([stakeId, latestSnapshot.id])
      let currentRecord = StakeSnapshotRecord.load(recordId) as StakeSnapshotRecord
      if(currentRecord != null) {
        let recordToSave = getStakeSnapshot(joinHyphen([currentRecord.contract, snapshot.id]), currentRecord.contract, snapshot.id)
        recordToSave.merge([currentRecord])
        recordToSave.timestamp = saveSnapshotTimestamp;
        recordToSave.snapshot = snapshot.id;
        recordToSave.save()
      }
    }

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



export function updateBondSnapshot(contract: Address, event: ethereum.Event): void {
  let latestSnapshot = getLatestSnapshot();
  let bondSnapshotId = joinHyphen([contract.toHex(), latestSnapshot.id])

  let iBond = DynamicBond.bind(contract);
  let depositToken = getToken(iBond.depositToken())

  let bondSnapshot = getBondSnapshot(bondSnapshotId, contract.toHex(), latestSnapshot.id)

  bondSnapshot.depositCummulated = convertTokenToDecimal(iBond.depositCumulated(), BigInt.fromI32(depositToken.decimal));
  bondSnapshot.bondCummulated = convertEthToDecimal(iBond.bondCumulated());
  bondSnapshot.depositCummulatedUSD = bondSnapshot.depositCummulated.times(depositToken.price)
  bondSnapshot.timestamp = event.block.timestamp;

  bondSnapshot.save()

  checkAndTakeStapshot(event.block.timestamp);
}

export function updateStakeSnapshot(contract: Address, event: ethereum.Event): void {
  let latestSnapshot = getLatestSnapshot();
  let stakeSnapshotId = joinHyphen([contract.toHex(), latestSnapshot.id])

  let iStake = StakingVault.bind(contract);

  let stakeSnapshot = getStakeSnapshot(stakeSnapshotId, contract.toHex(), latestSnapshot.id)
  let stakeToken = getToken(iStake.WANT_TOKEN())

  stakeSnapshot.tvl = convertEthToDecimal(iStake.balance())
  stakeSnapshot.tvlUSD = stakeSnapshot.tvl.times(stakeToken.price)
  stakeSnapshot.timestamp = event.block.timestamp;

  stakeSnapshot.save()

  checkAndTakeStapshot(event.block.timestamp);

}

