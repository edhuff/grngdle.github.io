export const advancedFamilies = [
  'digits', 'subtraction', 'division', 'factorials', 'powers', 'towers', 'tetration',
  'hyperoperations', 'arrows', 'chains', 'hierarchy', 'busy', 'ackermann',
] as const
export type AdvancedFamily = typeof advancedFamilies[number]
export type FamilyParameters = { weight: number; operandMax: number; complexity: number; digitBias: number }
export type GeneratorOptions = {
  wide: boolean
  vast: boolean
  arithmetic: boolean
  nesting: boolean
  anomaly: number
  specialization: 'magnitude' | 'rarity' | 'efficiency' | null
  advanced?: Partial<Record<AdvancedFamily, FamilyParameters>>
}

export const familyDefaults: Record<AdvancedFamily, FamilyParameters> = {
  digits: { weight: 5, operandMax: 9, complexity: 40, digitBias: 1 },
  subtraction: { weight: 4, operandMax: 99, complexity: 1, digitBias: 1 },
  division: { weight: 3, operandMax: 99, complexity: 1, digitBias: 1 },
  factorials: { weight: 3, operandMax: 120, complexity: 1, digitBias: 1 },
  powers: { weight: 5, operandMax: 12, complexity: 2, digitBias: 1 },
  towers: { weight: 3, operandMax: 6, complexity: 6, digitBias: 1 },
  tetration: { weight: 3, operandMax: 8, complexity: 9, digitBias: 1 },
  hyperoperations: { weight: 3, operandMax: 6, complexity: 4, digitBias: 1 },
  arrows: { weight: 2, operandMax: 6, complexity: 4, digitBias: 1 },
  chains: { weight: 2, operandMax: 5, complexity: 5, digitBias: 1 },
  hierarchy: { weight: 2, operandMax: 7, complexity: 4, digitBias: 1 },
  busy: { weight: 1, operandMax: 20, complexity: 1, digitBias: 1 },
  ackermann: { weight: 1, operandMax: 12, complexity: 9, digitBias: 1 },
}

function boundedInt(value: number, min: number, max: number) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError('Generator parameter is out of range')
  return value
}

export function checkParameters(id: AdvancedFamily, value: FamilyParameters): FamilyParameters {
  const minimum = id === 'digits' ? 26 : id === 'towers' || id === 'chains' ? 3 : 1
  const maximum = id === 'digits' ? 266 : id === 'arrows' ? 128 : 16
  return {
    weight: boundedInt(value.weight, 1, 1000),
    operandMax: boundedInt(value.operandMax, 2, 10_000),
    complexity: boundedInt(value.complexity, minimum, maximum),
    digitBias: boundedInt(value.digitBias, 1, 30),
  }
}

export function snapshot(options: GeneratorOptions): GeneratorOptions {
  const { wide, vast, arithmetic, nesting, anomaly, specialization } = options
  const advanced: GeneratorOptions['advanced'] = {}
  for (const id of advancedFamilies) {
    const params = options.advanced?.[id]
    if (params) advanced[id] = checkParameters(id, params)
  }
  return { wide, vast, arithmetic, nesting, anomaly: boundedInt(anomaly, 0, Number.MAX_SAFE_INTEGER), specialization,
    ...(Object.keys(advanced).length ? { advanced } : {}) }
}
