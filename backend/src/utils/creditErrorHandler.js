/**
 * Utility function to format credit-related errors for user-friendly responses
 * @param {Error} error - The error object from credit service
 * @param {number} requiredCredits - The number of credits required for the action
 * @returns {Object} Formatted error response object
 */
function formatCreditError(error, requiredCredits = null) {
  // Check if it's a debt limit error
  if (error.code === 'DEBT_LIMIT_REACHED') {
    return {
      error: 'Credit Limit Reached',
      message: error.message,
      errorCode: 'DEBT_LIMIT_REACHED',
      details: {
        currentDebt: error.currentDebt,
        debtLimit: error.debtLimit,
        availableDebtSpace: error.availableDebtSpace,
        currentBalance: error.currentBalance,
        maxAllowedAmount: error.maxAllowedAmount
      },
      requiredCredits: requiredCredits,
      // Use the full friendly message from the error (it already includes emojis and formatting)
      friendlyMessage: error.message
    };
  }

  // Generic insufficient credits error
  return {
    error: 'Insufficient Credits',
    message: error.message,
    details: error.message,
    requiredCredits: requiredCredits,
    friendlyMessage: error.message.includes('debt') 
      ? error.message 
      : `You don't have enough credits to perform this action. Please purchase more credits to continue.`
  };
}

module.exports = { formatCreditError };

