// Install native crypto (Ed25519, randomBytes) — must be first
import { install } from "react-native-quick-crypto";
install();

// Buffer polyfill for base64 encoding in Solana libs and er.ts
import { Buffer } from "buffer";
(global as any).Buffer = global.Buffer ?? Buffer;
