import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import idl from '../idl/idl.json';
import { PROGRAM_ID } from './useVaultState';

export function useSquadState() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [squadData, setSquadData] = useState<any>(null);
  const [squadPda, setSquadPda] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!wallet.publicKey) {
      setSquadData(null);
      setIsLoading(false);
      return;
    }

    const fetchSquad = async () => {
      try {
        const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
        const program = new Program(idl as any, PROGRAM_ID, provider);

        // 🚨 UPGRADED TO V2 🚨
        const allSquads = await program.account.squadVaultV2.all();

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
  }, [wallet.publicKey, connection]);

  return { squadData, squadPda, isLoading };
}