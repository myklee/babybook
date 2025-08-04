// Measurement system utilities for converting between metric (ml) and imperial (fl oz)

export type MeasurementUnit = 'metric' | 'imperial';

// Conversion factor: 1 fluid ounce = 29.5735 milliliters
const ML_PER_OZ = 29.5735;

/**
 * Convert milliliters to fluid ounces
 */
export function mlToOz(ml: number): number {
  return ml / ML_PER_OZ;
}

/**
 * Convert fluid ounces to milliliters
 */
export function ozToMl(oz: number): number {
  return oz * ML_PER_OZ;
}

/**
 * Round to appropriate precision for the unit
 * - Imperial: Round to nearest 0.25 oz
 * - Metric: Round to nearest 5 ml
 */
export function roundToUnitPrecision(value: number, unit: MeasurementUnit): number {
  if (unit === 'imperial') {
    // Round to nearest 0.25 oz
    return Math.round(value * 4) / 4;
  } else {
    // Round to nearest 5 ml
    return Math.round(value / 5) * 5;
  }
}

/**
 * Format amount with appropriate unit and precision
 */
export function formatAmount(mlValue: number, unit: MeasurementUnit): string {
  if (unit === 'imperial') {
    const ozValue = roundToUnitPrecision(mlToOz(mlValue), 'imperial');
    return `${ozValue}oz`;
  } else {
    const roundedMl = roundToUnitPrecision(mlValue, 'metric');
    return `${roundedMl}ml`;
  }
}

/**
 * Get display value for input fields (without unit suffix)
 */
export function getDisplayValue(mlValue: number, unit: MeasurementUnit): number {
  if (unit === 'imperial') {
    return roundToUnitPrecision(mlToOz(mlValue), 'imperial');
  } else {
    return roundToUnitPrecision(mlValue, 'metric');
  }
}

/**
 * Convert display value to ml for storage
 */
export function getStorageValue(displayValue: number, unit: MeasurementUnit): number {
  if (unit === 'imperial') {
    return Math.round(ozToMl(displayValue));
  } else {
    return Math.round(displayValue);
  }
}

/**
 * Get appropriate step value for input fields
 */
export function getInputStep(unit: MeasurementUnit): string {
  return unit === 'imperial' ? '0.25' : '5';
}

/**
 * Get unit label for display
 */
export function getUnitLabel(unit: MeasurementUnit): string {
  return unit === 'imperial' ? 'oz' : 'ml';
}

/**
 * Get preset button values for feeding amounts
 */
export function getFeedingPresets(unit: MeasurementUnit, feedingType: 'breast' | 'formula'): Array<{ display: number; storage: number; label: string }> {
  if (unit === 'imperial') {
    if (feedingType === 'breast') {
      return [
        { display: 3, storage: Math.round(ozToMl(3)), label: '3oz' },
        { display: 4, storage: Math.round(ozToMl(4)), label: '4oz' },
        { display: 5, storage: Math.round(ozToMl(5)), label: '5oz' }
      ];
    } else { // formula
      return [
        { display: 5, storage: Math.round(ozToMl(5)), label: '5oz' },
        { display: 6, storage: Math.round(ozToMl(6)), label: '6oz' },
        { display: 8, storage: Math.round(ozToMl(8)), label: '8oz' }
      ];
    }
  } else {
    if (feedingType === 'breast') {
      return [
        { display: 100, storage: 100, label: '100ml' },
        { display: 120, storage: 120, label: '120ml' },
        { display: 140, storage: 140, label: '140ml' }
      ];
    } else { // formula
      return [
        { display: 160, storage: 160, label: '160ml' },
        { display: 200, storage: 200, label: '200ml' },
        { display: 240, storage: 240, label: '240ml' }
      ];
    }
  }
}

/**
 * Convert validation thresholds to appropriate unit
 */
export function convertValidationThreshold(mlThreshold: number, unit: MeasurementUnit): number {
  if (unit === 'imperial') {
    return roundToUnitPrecision(mlToOz(mlThreshold), 'imperial');
  } else {
    return mlThreshold;
  }
}

/**
 * Get default amounts based on unit preference
 */
export function getDefaultAmount(unit: MeasurementUnit, feedingType: 'breast' | 'formula'): number {
  if (unit === 'imperial') {
    return feedingType === 'formula' ? 6 : 0; // 6oz for formula, 0 for breast
  } else {
    return feedingType === 'formula' ? 200 : 0; // 200ml for formula, 0 for breast
  }
}