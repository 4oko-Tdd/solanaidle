import { PublicKey } from "@solana/web3.js";

export const ER_VALIDATOR_MAP: Record<string, string> = {
  "https://devnet-us.magicblock.app": "MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd",
  "https://devnet-eu.magicblock.app": "MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e",
  "https://devnet-as.magicblock.app": "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57",
  "https://us.magicblock.app": "MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd",
  "https://eu.magicblock.app": "MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e",
  "https://as.magicblock.app": "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57",
};

export function getErValidatorPubkey(validatorUrl: string): PublicKey {
  return new PublicKey(
    ER_VALIDATOR_MAP[validatorUrl] || "MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd"
  );
}
