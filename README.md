# 🩸 ForgeFi: The Dark Fitness Protocol
**Eternal Hackathon Sprint Submission**

ForgeFi is a decentralized, high-stakes fitness protocol built on Solana. Users lock their SOL into a PDA vault and commit to a workout split. If they verify their geolocation at the gym every 24 hours, their SOL is safe. If they miss a day, the autonomous Executioner Bot slashes 10% of their stake and bleeds it to the protocol treasury.

### 🏗️ Architecture & Codebases
We utilized a microservice-style Polyrepo architecture to separate our concerns. 

* 🖥️ **[Frontend Application (This Repo)](#)**: The React/Web3 interface and Geolocation Oracle.
* ⚙️ **[Smart Contract (Rust/Anchor)]https://github.com/VishantJadhav/forgefi-backend**: The immutable logic, PDAs, and Vampire Bleed mathematical constraints.
* 💀 **[The Executioner Bot (Node.js)]https://github.com/VishantJadhav/forgefi-executioner**: The autonomous CRON job that constantly scans the Devnet to execute slashing transactions on late users.

### 🚀 Try It Out
* **Live Demo:** [Insert Vercel/Netlify Link]
