import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";

import '@solana/wallet-adapter-react-ui/styles.css';
import LandingPage from "./components/Landingpage";

function App() {

  // 1. Lock our app into the Solana Devnet
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  //Modern wallet adapter detect solana
  const wallets = useMemo(() => [], [])

  return(

  <ConnectionProvider endpoint={endpoint}>
    <WalletProvider wallets={wallets}>
      <WalletModalProvider>

        <LandingPage/>

      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>

 )
}

export default App

