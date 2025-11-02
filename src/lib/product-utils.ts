import type { Product, Inventory } from './definitions';

/**
 * Calculates the total number of base units based on the inventory at each packaging level.
 */
export function calculateTotalUnits(
  inventory: Inventory,
  structure: 'simple' | 'hierarchical',
  quantityPerBox?: number,
  boxesPerPallet?: number
): number {
  if (structure === 'simple') {
    return inventory.fpakk || 0;
  }
  
  // For hierarchical structure
  const fpakkCount = inventory.fpakk || 0;
  const mellompakkCount = inventory.mellompakk || 0;
  const toppakkCount = inventory.toppakk || 0;
  
  const unitsPerMellompakk = quantityPerBox || 0;
  const mellompakksPerToppakk = boxesPerPallet || 0;
  
  const unitsFromMellompakk = mellompakkCount * unitsPerMellompakk;
  const unitsFromToppakk = toppakkCount * mellompakksPerToppakk * unitsPerMellompakk;
  
  return fpakkCount + unitsFromMellompakk + unitsFromToppakk;
}

/**
 * Calculates the total number of base units in a single Toppakk (pallet).
 */
export function calculateToppakkTotalUnits(
  boxesPerPallet: number,
  quantityPerBox: number
): number {
  return boxesPerPallet * quantityPerBox;
}

/**
 * Validates that a product configuration is valid before saving.
 * This is a basic example; more complex rules can be added.
 */
export function validateProductConfiguration(product: Partial<Product>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!product.name) errors.push('Product name is required');
  if (!product.structure) errors.push('Product structure is required');
  
  if (product.structure === 'hierarchical') {
    if (!product.fpakk) errors.push('Fpakk (base unit) details are required for hierarchical products');
    if (!product.mellompakk) errors.push('Mellompakk (inner pack) details are required for hierarchical products');
    if (!product.toppakk) errors.push('Toppakk (outer case) details are required for hierarchical products');
    
    if (product.mellompakk && (product.mellompakk.quantityPerBox || 0) <= 0) {
        errors.push('Mellompakk must contain at least 1 unit.')
    }
     if (product.toppakk && (product.toppakk.boxesPerPallet || 0) <= 0) {
        errors.push('Toppakk must contain at least 1 pack.')
    }

  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Formats inventory levels for display purposes.
 */
export function formatPackagingLevel(
  level: 'fpakk' | 'mellompakk' | 'toppakk',
  quantity: number,
  product: Product
): string {
  if (level === 'fpakk') {
    return `${quantity} stk`;
  }
  
  if (level === 'mellompakk' && product.mellompakk) {
    const totalUnits = quantity * (product.mellompakk.quantityPerBox || 0);
    return `${quantity} kasser (${totalUnits} stk)`;
  }
  
  if (level === 'toppakk' && product.toppakk && product.mellompakk) {
    const boxesPerPallet = product.toppakk.boxesPerPallet || 0;
    const quantityPerBox = product.mellompakk.quantityPerBox || 0;
    const totalBoxes = quantity * boxesPerPallet;
    const totalUnits = totalBoxes * quantityPerBox;
    return `${quantity} paller (${totalBoxes} kasser, ${totalUnits} stk)`;
  }
  
  return `${quantity}`;
}
