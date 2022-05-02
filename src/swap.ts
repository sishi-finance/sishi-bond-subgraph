import { BigInt } from "@graphprotocol/graph-ts"
import {
  PancakeLP,
  Approval,
  Burn,
  Mint,
  Swap,
  Sync,
  Transfer
} from "../generated/PancakeLP/PancakeLP"
import { updateAll } from "./snapshot"

export function handleApproval(event: Approval): void {}


export function handleBurn(event: Burn): void {
  updateAll(event);
}

export function handleMint(event: Mint): void {
  updateAll(event);
}

export function handleSwap(event: Swap): void {
  updateAll(event);
}

export function handleSync(event: Sync): void {}

export function handleTransfer(event: Transfer): void {}
