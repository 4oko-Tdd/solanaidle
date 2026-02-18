import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplCore, createCollection, create, fetchCollectionV1 } from "@metaplex-foundation/mpl-core";
import {
  generateSigner,
  keypairIdentity,
  publicKey,
  type Umi,
} from "@metaplex-foundation/umi";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const COLLECTIONS_FILE = path.join(DATA_DIR, "collections.json");
const DEV_KEYPAIR_FILE = path.resolve(__dirname, "../../../../keys/dev.json");

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const API_BASE = process.env.API_BASE_URL || "http://localhost:3000/api";

let _umi: Umi | null = null;
let collections: { relics: string; achievements: string } | null = null;

function getUmi(): Umi {
  if (_umi) return _umi;

  _umi = createUmi(RPC_URL).use(mplCore());

  const raw = JSON.parse(fs.readFileSync(DEV_KEYPAIR_FILE, "utf-8"));
  const secretKeyBytes = new Uint8Array(raw);

  const keypair = _umi.eddsa.createKeypairFromSecretKey(secretKeyBytes);
  _umi.use(keypairIdentity(keypair));

  return _umi;
}

/** Create relic + achievement collections if they don't exist */
export async function ensureCollections(): Promise<void> {
  if (collections) return;

  if (fs.existsSync(COLLECTIONS_FILE)) {
    collections = JSON.parse(fs.readFileSync(COLLECTIONS_FILE, "utf-8"));
    console.log("Collections loaded:", collections);
    return;
  }

  try {
    const u = getUmi();

    const relicCollection = generateSigner(u);
    await createCollection(u, {
      collection: relicCollection,
      name: "Solana Idle: Relics",
      uri: `${API_BASE}/nfts/metadata/collection/relics`,
    }).sendAndConfirm(u);

    const achievementCollection = generateSigner(u);
    await createCollection(u, {
      collection: achievementCollection,
      name: "Solana Idle: Achievements",
      uri: `${API_BASE}/nfts/metadata/collection/achievements`,
    }).sendAndConfirm(u);

    collections = {
      relics: relicCollection.publicKey.toString(),
      achievements: achievementCollection.publicKey.toString(),
    };

    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(COLLECTIONS_FILE, JSON.stringify(collections, null, 2));
    console.log("Collections created:", collections);
  } catch (err) {
    console.error("Failed to create collections (mint keypair may need funding):", err);
    console.log("NFT minting will be unavailable until collections are created.");
  }
}

/** Mint a relic NFT to a player's wallet */
export async function mintRelic(
  walletAddress: string,
  relicName: string,
  attrs: {
    item_name: string;
    source_mission: string;
    epoch: string;
    player_level: string;
    dropped_at: string;
  }
): Promise<{ mintAddress: string }> {
  if (!collections) throw new Error("Collections not initialized");
  const u = getUmi();

  const asset = generateSigner(u);
  const collection = await fetchCollectionV1(u, publicKey(collections.relics));

  await create(u, {
    asset,
    name: relicName,
    uri: `${API_BASE}/nfts/metadata/relic/${asset.publicKey.toString()}`,
    collection,
    owner: publicKey(walletAddress),
    plugins: [
      {
        type: "Attributes",
        attributeList: Object.entries(attrs).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ],
  }).sendAndConfirm(u);

  return { mintAddress: asset.publicKey.toString() };
}

/** Mint an achievement badge NFT to a player's wallet */
export async function mintBadge(
  walletAddress: string,
  badgeName: string,
  attrs: {
    achievement: string;
    earned_at: string;
    epoch: string;
    stat_value: string;
  }
): Promise<{ mintAddress: string }> {
  if (!collections) throw new Error("Collections not initialized");
  const u = getUmi();

  const asset = generateSigner(u);
  const collection = await fetchCollectionV1(u, publicKey(collections.achievements));

  await create(u, {
    asset,
    name: badgeName,
    uri: `${API_BASE}/nfts/metadata/badge/${asset.publicKey.toString()}`,
    collection,
    owner: publicKey(walletAddress),
    plugins: [
      {
        type: "Attributes",
        attributeList: Object.entries(attrs).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ],
  }).sendAndConfirm(u);

  return { mintAddress: asset.publicKey.toString() };
}

/** Check if minting is available */
export function isMintingAvailable(): boolean {
  return collections !== null;
}
