import create from 'zustand';

interface AttributeState {
  attributes: {
    submissionType: string;
    drugName: string;
    drugPhase: string;
    therapeuticArea: string;
    moleculeType: string;
    targetRegion: string;
    sponsor: string;
    template: string;
  };
  setAttributes: (attributes: Partial<AttributeState['attributes']>) => void;
  resetAttributes: () => void;
}

const defaultAttributes = {
  submissionType: 'IND',
  drugName: 'DRUG001',
  drugPhase: 'Preclinical',
  therapeuticArea: 'Oncology',
  moleculeType: 'Small Molecule',
  targetRegion: 'US',
  sponsor: 'WonderTEST',
  template: 'Default'
};

export const useAttributeStore = create<AttributeState>((set) => ({
  attributes: defaultAttributes,
  setAttributes: (newAttributes) => 
    set((state) => ({
      attributes: { ...state.attributes, ...newAttributes }
    })),
  resetAttributes: () => set({ attributes: defaultAttributes })
})); 