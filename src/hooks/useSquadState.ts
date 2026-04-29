import { useEffect, useState } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import idl from '../idl/idl.json';
import { PROGRAM_ID } from './useVaultState';

export function useSquadState() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet(); 
  const [squadData, setSquadData] = useState<any>(null);
  const [squadPda, setSquadPda] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!wallet.publicKey || !anchorWallet) {
      setSquadData(null);
      setIsLoading(false);
      return;
    }

    const fetchSquad = async () => {
      try {
        const provider = new AnchorProvider(connection, anchorWallet, { preflightCommitment: 'confirmed' });
        const program = new Program(idl as any, PROGRAM_ID, provider);

        // This tells Anchor to completely ignore the corrupted V2 vaults and only fetch 209-byte V3 vaults.
        const allSquads = await program.account.squadVaultV2.all([
          { dataSize: 209 } 
        ]);

        const myAddress = wallet.publicKey!.toBase58();
        const mySquad = allSquads.find((squad : any) => 
          squad.account.playerOne.toBase58() === myAddress ||
          squad.account.playerTwo.toBase58() === myAddress ||
          squad.account.playerThree.toBase58() === myAddress
        );

        if (mySquad) {
          setSquadData(mySquad.account);
          setSquadPda(mySquad.publicKey.toBase58());
        } else {
          setSquadData(null);
          setSquadPda(null);
        }
      } catch (error) {
        console.error("Failed to fetch squad state:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSquad();
    const interval = setInterval(fetchSquad, 5000);
    return () => clearInterval(interval);
  }, [wallet.publicKey, anchorWallet, connection]);

  return { squadData, squadPda, isLoading };
}