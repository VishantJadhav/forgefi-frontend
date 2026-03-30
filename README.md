# 🩸 ForgeFi: The Dark Fitness Protocol
**Eternal Hackathon Sprint Submission**

ForgeFi is a decentralized, high-stakes fitness protocol built on Solana. Users lock their SOL into a PDA vault and commit to a ruthless workout split. If they verify their geolocation at the gym every 24 hours, their SOL is safe. If they miss a day, the autonomous Executioner Bot slashes 10% of their stake and bleeds it to the protocol treasury. Weakness is punished.

### 🏗️ Polyrepo Architecture
We utilized a microservice-style Polyrepo architecture to cleanly separate our concerns. 

* 🖥️ **[Frontend Application (This Repo)](#)**: The React/Web3 interface and Geolocation Oracle.
* ⚙️ **[Smart Contract (Rust/Anchor)]https://github.com/VishantJadhav/forgefi-backend**: The immutable logic, PDAs, and Vampire Bleed mathematical constraints.
* 💀 **[The Executioner Bot (Node.js)]https://github.com/VishantJadhav/forgefi-executioner**: The autonomous CRON job that constantly scans the Devnet to execute slashing transactions on late users.

### ⚙️ The Core Loop
1. **Lock:** User stakes 0.5 SOL for a 6-day PPL split.
2. **Verify:** User physically goes to the gym. The frontend Oracle validates the GPS coordinates using the Haversine formula and sends the signature to the blockchain.
3. **Bleed:** If the 24-hour timer expires, the Executioner bot automatically triggers the `slash_workout` instruction. The user loses 10%, and the Iron Matrix UI records a permanent dead block on their timeline.

### 🚀 Try It Out
* **Live Demo:** [Insert Vercel/Netlify Link Here]
