import { type Expense } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';

export async function initializeTagsAndPaymentMethods() {
  try {
    // Fetch existing expenses
    const expenses: Expense[] = await fetch('/api/expenses').then(res => res.json());
    
    // Extract unique tags and payment methods
    const uniqueTags = [...new Set(expenses.map(exp => exp.tag))].filter(Boolean);
    const uniquePaymentMethods = [...new Set(expenses.map(exp => exp.paymentMethod))].filter(Boolean);
    
    // Get existing tags and payment methods
    const existingTags = await fetch('/api/tags').then(res => res.json()).catch(() => []);
    const existingPaymentMethods = await fetch('/api/payment-methods').then(res => res.json()).catch(() => []);
    
    const existingTagNames = new Set(existingTags.map((tag: { name: string }) => tag.name));
    const existingPaymentMethodNames = new Set(existingPaymentMethods.map((pm: { name: string }) => pm.name));
    
    // Create missing tags
    const tagsToCreate = uniqueTags.filter(tag => !existingTagNames.has(tag));
    for (let i = 0; i < tagsToCreate.length; i++) {
      const tagName = tagsToCreate[i];
      await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tagName,
          description: `Auto-created from existing expense data`
        })
      });
    }
    
    // Create missing payment methods
    const paymentMethodsToCreate = uniquePaymentMethods.filter(pm => !existingPaymentMethodNames.has(pm));
    for (let i = 0; i < paymentMethodsToCreate.length; i++) {
      const pmName = paymentMethodsToCreate[i];
      await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pmName,
          description: `Auto-created from existing expense data`
        })
      });
    }
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
    queryClient.invalidateQueries({ queryKey: ['/api/payment-methods'] });
    
    return {
      tagsCreated: tagsToCreate.length,
      paymentMethodsCreated: paymentMethodsToCreate.length
    };
  } catch (error) {
    console.error('Failed to initialize tags and payment methods:', error);
    throw error;
  }
}