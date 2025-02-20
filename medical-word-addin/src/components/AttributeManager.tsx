import * as React from 'react';
import { Stack, Label, Dropdown, IDropdownOption, IStackStyles } from '@fluentui/react';
import { useAttributeStore } from '../store/attributeStore';

interface Attribute {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'dropdown';
  options?: IDropdownOption[];
  required?: boolean;
}

export const AttributeManager: React.FC = () => {
  // Define default attributes based on the image
  const defaultAttributes: Attribute[] = [
    {
      key: 'submissionType',
      label: 'Submission Type',
      value: 'IND',
      type: 'dropdown',
      options: [
        { key: 'IND', text: 'IND' },
        { key: 'NDA', text: 'NDA' },
        { key: 'BLA', text: 'BLA' },
        { key: 'ANDA', text: 'ANDA' }
      ],
      required: true
    },
    {
      key: 'drugName',
      label: 'Drug Name',
      value: 'DRUG001',
      type: 'dropdown',
      options: [
        { key: 'DRUG001', text: 'DRUG001' },
        { key: 'DRUG002', text: 'DRUG002' }
      ],
      required: true
    },
    {
      key: 'drugPhase',
      label: 'Drug Phase',
      value: 'Preclinical',
      type: 'dropdown',
      options: [
        { key: 'Preclinical', text: 'Preclinical' },
        { key: 'Regulatory Submission - IND', text: 'Regulatory Submission - IND' },
        { key: 'Clinical Trials - Phase I', text: 'Clinical Trials - Phase I' },
        { key: 'Clinical Trials - Phase II', text: 'Clinical Trials - Phase II' },
        { key: 'Clinical Trials - Phase III', text: 'Clinical Trials - Phase III' },
        { key: 'Regulatory Review', text: 'Regulatory Review' },
        { key: 'Market Launch', text: 'Market Launch' },
        { key: 'Post-Market Surveillance', text: 'Post-Market Surveillance' }
      ],
      required: true
    },
    {
      key: 'therapeuticArea',
      label: 'Therapeutic Area',
      value: 'Oncology',
      type: 'dropdown',
      options: [
        { key: 'Oncology', text: 'Oncology' },
        { key: 'Cardiology', text: 'Cardiology' },
        { key: 'Neurology', text: 'Neurology' },
        { key: 'Immunology', text: 'Immunology' }
      ],
      required: true
    },
    {
      key: 'moleculeType',
      label: 'Molecule Type',
      value: 'Small Molecule',
      type: 'dropdown',
      options: [
        { key: 'Small Molecule', text: 'Small Molecule' },
        { key: 'Biologic', text: 'Biologic' },
        { key: 'Cell Therapy', text: 'Cell Therapy' },
        { key: 'Gene Therapy', text: 'Gene Therapy' }
      ],
      required: true
    },
    {
      key: 'targetRegion',
      label: 'Target Region',
      value: 'US',
      type: 'dropdown',
      options: [
        { key: 'US', text: 'US' },
        { key: 'EU', text: 'EU' },
        { key: 'Japan', text: 'Japan' },
        { key: 'China', text: 'China' }
      ],
      required: true
    },
    {
      key: 'sponsor',
      label: 'Sponsor',
      value: 'WonderTEST',
      type: 'dropdown',
      options: [
        { key: 'WonderTEST', text: 'WonderTEST' },
        { key: 'WonderTEST Branch1', text: 'WonderTEST Branch1' },
        { key: 'WonderTEST Branch2', text: 'WonderTEST Branch2' }
      ],
      required: true
    },
    {
      key: 'template',
      label: 'Template',
      value: 'Default',
      type: 'dropdown',
      options: [
        { key: 'Default', text: 'Default' },
        { key: 'Customized1', text: 'Customized1' },
        { key: 'Customized2', text: 'Customized2' }
      ],
      required: true
    }
  ];

  const [attributes, setAttributes] = React.useState<Attribute[]>(defaultAttributes);

  const handleAttributeChange = (key: string, newValue: string) => {
    setAttributes(prev => 
      prev.map(attr => 
        attr.key === key ? { ...attr, value: newValue } : attr
      )
    );
  };

  const stackStyles: IStackStyles = {
    root: {
      padding: 20,
      selectors: {
        '.attribute-row': {
          display: 'flex',
          alignItems: 'center',
          height: 32,
          marginBottom: 8
        },
        '.attribute-label': {
          width: 150,
          marginRight: 12,
          textAlign: 'right',
          fontSize: 14,
          fontWeight: 600
        },
        '.attribute-value': {
          flex: 1,
          maxWidth: 300
        }
      }
    }
  };

  return (
    <Stack styles={stackStyles}>
      <Stack.Item>
        <h2 style={{ margin: '0 0 20px 0' }}>Attributes</h2>
      </Stack.Item>
      
      {attributes.map(attr => (
        <Stack.Item key={attr.key} className="attribute-row">
          <Label className="attribute-label">
            {attr.label}:
          </Label>
          <div className="attribute-value">
            <Dropdown
              selectedKey={attr.value}
              options={attr.options || []}
              onChange={(_, option) => option && handleAttributeChange(attr.key, option.key as string)}
              styles={{
                root: { margin: 0 },
                title: { height: 32, lineHeight: '30px', borderRadius: 2 },
                dropdown: { width: '100%' }
              }}
            />
          </div>
        </Stack.Item>
      ))}
    </Stack>
  );
}; 