// Install native crypto (Ed25519, randomBytes) — must be first
import { install } from "react-native-quick-crypto";
install();

// Base64 globals (base64FromArrayBuffer, btoa, atob) used by @solana/web3.js
import "react-native-quick-base64";

// Buffer polyfill for base64 encoding in Solana libs and er.ts
import { Buffer } from "buffer";
(global as any).Buffer = global.Buffer ?? Buffer;
