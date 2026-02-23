# Seeker Node  
### MagicBlock Hackathon Submission

---

## Slide 1 — What Is Seeker Node

### A week-long roguelike where the entire world fights one boss together.

Every Saturday:
- A global boss spawns  
- Every player attacks the same HP bar  
- If the boss dies → everyone gets rewards  
- If it survives → nobody wins  

There is no backend HP.  
There is no fake multiplayer.  

There is one shared on-chain truth.

---

## Slide 2 — The Core Idea

## The Boss HP Is a Solana Account

The boss health lives inside a `BossState` PDA.

It is:
- Delegated to MagicBlock’s Ephemeral Rollup  
- Updated in real-time  
- Subscribed to via WebSocket by every client  

When one player presses **OVERLOAD**:
1. A transaction hits the Ephemeral Rollup  
2. The PDA updates  
3. Every connected client re-renders instantly  

One account.  
Many players.  
Live.

---

## Slide 3 — Why MagicBlock Is Essential

Without MagicBlock:

- Every damage tick costs SOL  
- 400–800ms confirmation times  
- The game feels delayed  
- Real-time shared gameplay becomes too expensive  

With MagicBlock ER:

- Free writes  
- Instant confirmation  
- WebSocket account updates  
- Settlement to Solana at weekend end  

Remove ER → the boss fight becomes a refresh-to-check leaderboard.  

With ER → it's a live global event.

---

## Slide 4 — Architecture

```
Players (Android Expo App)
        ↓ WebSocket
MagicBlock Ephemeral Rollup
        ↓ finalize
Solana Base Layer
```

Flow:

1. Boss initialized on Solana  
2. PDA delegated to ER  
3. Damage applied on ER (instant + free)  
4. Weekend ends → state committed to Solana permanently  

The blockchain is not a feature.  
It is the gameplay mechanic.

---

## Slide 5 — Demo Moment

What you will see live:

1. Open the app → Boss HP visible with [ER] indicator  
2. Press OVERLOAD  
3. HP drops instantly  
4. Open ER endpoint → account data updated  
5. Open Solana Explorer → same PDA committed after finalize  

What just happened:

That HP drop was not a backend integer.  
It was a Solana account updated on MagicBlock’s Ephemeral Rollup.

Every player on Earth was subscribed to the same account.

---

## Closing Statement

MagicBlock enables something Solana couldn’t do before:

Shared, real-time on-chain state  
that feels like multiplayer  
and still settles permanently.