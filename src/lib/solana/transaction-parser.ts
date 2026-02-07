import { Connection, ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';

import { RPC_URL } from '../constants';

/**
 * Transaction Parser Utility
 * Parses Solana transactions and extracts meaningful information
 */

export interface ParsedTransactionData {
  signature: string;
  blockTime: number | null;
  slot: number;
  fee: number;
  success: boolean;
  from?: string;
  to?: string;
  amount?: number;
  token?: string;
  type: string;
  instructions: ParsedInstruction[];
}

export interface ParsedInstruction {
  programId: string;
  type: string;
  data?: any;
}

/**
 * Parse a transaction signature and return detailed information
 */
export async function parseTransaction(
  signature: string,
): Promise<ParsedTransactionData | null> {
  try {
    const connection = new Connection(RPC_URL);
    
    const transaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      return null;
    }

    return extractTransactionData(transaction, signature);
  } catch (error) {
    console.error('Error parsing transaction:', error);
    return null;
  }
}

/**
 * Extract meaningful data from a parsed transaction
 */
function extractTransactionData(
  transaction: ParsedTransactionWithMeta,
  signature: string,
): ParsedTransactionData {
  const { meta, blockTime, slot, transaction: tx } = transaction;
  
  // Extract fee
  const fee = meta?.fee || 0;
  
  // Determine success
  const success = meta?.err === null;
  
  // Parse instructions
  const instructions: ParsedInstruction[] = [];
  
  if (tx.message.instructions) {
    for (const instruction of tx.message.instructions) {
      const programId = instruction.programId.toString();
      
      // Handle parsed instructions
      if ('parsed' in instruction) {
        instructions.push({
          programId,
          type: instruction.parsed.type,
          data: instruction.parsed.info,
        });
      } else {
        // Handle raw instructions
        instructions.push({
          programId,
          type: 'unknown',
          data: instruction.data,
        });
      }
    }
  }
  
  // Determine transaction type and extract key details
  let transactionType = 'unknown';
  let from: string | undefined;
  let to: string | undefined;
  let amount: number | undefined;
  let token: string | undefined;
  
  // Look for transfer instructions
  for (const instruction of instructions) {
    if (instruction.type === 'transfer' || instruction.type === 'transferChecked') {
      transactionType = 'transfer';
      from = instruction.data?.source || instruction.data?.authority;
      to = instruction.data?.destination;
      amount = instruction.data?.amount || instruction.data?.tokenAmount?.amount;
      token = instruction.data?.mint;
      break;
    } else if (instruction.type === 'swap') {
      transactionType = 'swap';
      break;
    }
  }

  return {
    signature,
    blockTime: blockTime || null,
    slot,
    fee,
    success,
    from,
    to,
    amount,
    token,
    type: transactionType,
    instructions,
  };
}

/**
 * Get recent transactions for an address
 */
export async function getAddressTransactions(
  address: string,
  limit: number = 10,
): Promise<ParsedTransactionData[]> {
  try {
    const connection = new Connection(RPC_URL);
    const publicKey = new PublicKey(address);
    
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit,
    });
    
    const transactions: ParsedTransactionData[] = [];
    
    for (const sig of signatures) {
      const parsed = await parseTransaction(sig.signature);
      if (parsed) {
        transactions.push(parsed);
      }
    }
    
    return transactions;
  } catch (error) {
    console.error('Error getting address transactions:', error);
    return [];
  }
}

/**
 * Format transaction data for display
 */
export function formatTransactionData(data: ParsedTransactionData): string {
  const lines = [
    `Signature: ${data.signature}`,
    `Status: ${data.success ? '✅ Success' : '❌ Failed'}`,
    `Type: ${data.type}`,
    `Fee: ${data.fee / 1e9} SOL`,
  ];
  
  if (data.blockTime) {
    const date = new Date(data.blockTime * 1000);
    lines.push(`Time: ${date.toLocaleString()}`);
  }
  
  if (data.from && data.to) {
    lines.push(`From: ${data.from.slice(0, 8)}...${data.from.slice(-8)}`);
    lines.push(`To: ${data.to.slice(0, 8)}...${data.to.slice(-8)}`);
  }
  
  if (data.amount) {
    lines.push(`Amount: ${data.amount}`);
  }
  
  return lines.join('\n');
}
