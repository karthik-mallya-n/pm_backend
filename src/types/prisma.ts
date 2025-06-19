import { PrismaClient } from '@prisma/client';

// Define the transaction type to avoid 'any' type errors
export type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
