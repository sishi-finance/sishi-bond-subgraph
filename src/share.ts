import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { DynamicBond } from "../generated/DynamicBond/DynamicBond";
import { ERC20 } from "../generated/DynamicBond/ERC20";
import { BondContract, DataRegistry, StakeContract, Token, User } from "../generated/schema";
import { StakingVault } from "../generated/StakingVault/StakingVault";
import { StakingDistributor } from "../generated/StakingVault/StakingDistributor";
import { convertEthToDecimal } from "./utils";
import { getDecimals, getUSDRate } from "./utils/pricing";


export function getBondRegistry(): DataRegistry{
  let reg = DataRegistry.load("default")
  if(reg == null){
    reg = new DataRegistry("default")
    reg.bonds = [];
    reg.stakes = [];
    reg.tokens = [];
    reg.save()
  }
  return reg as DataRegistry
}


export function getToken(address: Address): Token {
  let tokenId = address.toHexString();
  let token = Token.load(tokenId);

  if (token == null) {
    let iToken = ERC20.bind(address);
    token = new Token(tokenId);
    token.decimal = iToken.decimals();
    token.name = iToken.name();
    token.symbol = iToken.symbol();
    token.price = getUSDRate(address, BigInt.fromI32(iToken.decimals()));
    token.save();

    let reg = getBondRegistry()
    let tokens = reg.tokens
    tokens.push(token.id)
    reg.tokens = tokens
    reg.save();

  }else {
    token.price = getUSDRate(address, getDecimals(address));
    token.save();
  }

  return token as Token;
}

export function getBondPool(address: Address): BondContract {
  let contractId = address.toHexString();
  let contract = BondContract.load(contractId);

  if (contract == null) {
    let iBond = DynamicBond.bind(address);

    contract = new BondContract(contractId);
    contract.token = getToken(iBond.depositToken()).id;
    contract.payoutToken = getToken(iBond.payoutToken()).id;
    contract.totalDeposit = BigDecimal.fromString("0");
    contract.totalPayout = BigDecimal.fromString("0");
    contract.save();

    let reg = getBondRegistry()
    let contracts = reg.bonds
    contracts.push(contract.id)
    reg.bonds = contracts
    reg.save();

  }

  return contract as BondContract;
}

export function getBondStake(address: Address): StakeContract {
  let contractId = address.toHexString();
  let contract = StakeContract.load(contractId);

  if (contract == null) {
    let iStake = StakingVault.bind(address);
    let iDistributor = StakingDistributor.bind(iStake.REWARD_DISTRIBUTOR());

    contract = new StakeContract(contractId);
    contract.tvl = BigDecimal.fromString("0");
    contract.locktime = iStake.LOCK_PERIOD();
    contract.boost = convertEthToDecimal(iDistributor.vaultBoosts(address));
    contract.tvl = convertEthToDecimal(iStake.balance());

    contract.save();

    let reg = getBondRegistry()
    let contracts = reg.stakes
    contracts.push(contract.id)
    reg.stakes = contracts
    reg.save();

  } else {
    let iStake = StakingVault.bind(address);
    let iDistributor = StakingDistributor.bind(iStake.REWARD_DISTRIBUTOR());

    contract.boost = convertEthToDecimal(iDistributor.vaultBoosts(address));
    contract.tvl = convertEthToDecimal(iStake.balance());
    contract.save();
  }

  return contract as StakeContract;
}


export function getUser(address: Address, timestamp: BigInt): User {
  let userId = address.toHexString();
  let user = User.load(userId);

  if (user == null) {

    user = new User(userId);
    user.joinTime = timestamp;
    user.totalBondDepositUSD = BigDecimal.fromString("0");
    user.totalBondPayout = BigDecimal.fromString("0");;
    user.totalBondCount = BigInt.fromString("0");
    user.totalStake = BigDecimal.fromString("0");;
    user.totalUnstake = BigDecimal.fromString("0");;
    user.save();
  }

  return user as User;
}


