// Global polyfills required by Solana libs on Hermes (React Native)
import { Buffer } from "buffer";
(global as any).Buffer = global.Buffer ?? Buffer;
