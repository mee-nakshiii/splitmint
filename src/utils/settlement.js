/**
 * Minimizes transactions between debtors and creditors.
 * This is the "Brain" of SplitMint.
 */
export const minimizeTransactions = (balances) => {
  let debtors = [];
  let creditors = [];

  // 1. Sort participants into those who owe (debtors) and those who are owed (creditors)
  for (let name in balances) {
    if (balances[name] < -0.01) {
      debtors.push({ name, amount: Math.abs(balances[name]) });
    } else if (balances[name] > 0.01) {
      creditors.push({ name, amount: balances[name] });
    }
  }

  let transactions = [];

  // 2. Pair them up until everyone is settled
  while (debtors.length > 0 && creditors.length > 0) {
    let debtor = debtors[0];
    let creditor = creditors[0];
    
    // Find the maximum amount that can be settled between these two
    let settledAmount = Math.min(debtor.amount, creditor.amount);

    transactions.push({
      from: debtor.name,
      to: creditor.name,
      amount: settledAmount.toFixed(2), // Keep it to 2 decimal places
    });

    // Update their remaining balances
    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    // If a person is fully settled (balance 0), remove them from the list
    if (debtor.amount < 0.01) debtors.shift();
    if (creditor.amount < 0.01) creditors.shift();
  }
  
  return transactions;
};
