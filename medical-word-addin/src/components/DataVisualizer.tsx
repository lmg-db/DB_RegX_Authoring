import * as React from 'react';
import { Stack, Label, Dropdown, PrimaryButton, Spinner, Toggle, DetailsList, Text, DefaultButton } from '@fluentui/react';
import { useDatasetStore } from '../store/datasetStore';

const chartTypes = [
  { key: 'bar', text: 'Bar Chart' },
  { key: 'line', text: 'Line Chart' },
  { key: 'pie', text: 'Pie Chart' },
  { key: 'scatter', text: 'Scatter Plot' }
];

export const DataVisualizer: React.FC = () => {
  const [error, setError] = React.useState<string | null>(null);
  const {
    currentDataset,
    visualizationConfig,
    generatedImage,
    setDataset,
    updateConfig,
    generateVisualization,
    uploadDataset,
  } = useDatasetStore();
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      if (!validTypes.includes(file.type)) {
        setError('Please upload a CSV or Excel file');
        return;
      }
      
      setError(null);
      try {
        await uploadDataset(file);
      } catch (error) {
        setError(error.response?.data?.detail || 'Failed to upload file');
      }
    }
  };

  const handleGenerateVisualization = async () => {
    if (!currentDataset) {
      setError('Please upload a dataset first');
      return;
    }
    
    if (!visualizationConfig.xAxis || !visualizationConfig.yAxis) {
      setError('Please select both X and Y axes');
      return;
    }
    
    setError(null);
    setIsGenerating(true);
    try {
      await generateVisualization();
    } catch (error) {
      setError(error.message || 'Failed to generate visualization');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Stack styles={{
      root: {
        width: '680px',
        minWidth: '680px',
        maxWidth: '680px',
        padding: '12px',
        backgroundColor: 'white',
        border: '1px solid #e1e1e1',
        borderRadius: '4px'
      }
    }}>
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
        <Text variant="mediumPlus" styles={{ 
          root: { 
            fontSize: '14px',
            fontWeight: '600'
          } 
        }}>
          Data Visualization
        </Text>
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <Dropdown
            placeholder="Chart Type"
            options={[
              { key: 'bar', text: 'Bar Chart' },
              { key: 'line', text: 'Line Chart' },
              { key: 'pie', text: 'Pie Chart' }
            ]}
            styles={{
              dropdown: { 
                width: 120,
                height: '28px'
              }
            }}
          />
          <Dropdown
            placeholder="X Axis"
            options={currentDataset?.columns?.map(col => ({
              key: col,
              text: col
            })) || []}
            styles={{
              dropdown: { 
                width: 120,
                height: '28px'
              }
            }}
          />
          <Dropdown
            placeholder="Y Axis"
            options={currentDataset?.columns?.map(col => ({
              key: col,
              text: col
            })) || []}
            styles={{
              dropdown: { 
                width: 120,
                height: '28px'
              }
            }}
          />
        </Stack>
      </Stack>
      
      <div style={{ 
        width: '100%',
        height: '300px',
        marginTop: '12px',
        border: '1px solid #e1e1e1',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        {generatedImage && (
          <img 
            src={`data:image/png;base64,${generatedImage}`}
            alt="data visualization"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        )}
      </div>

      {/* File upload area */}
      <Stack>
        <Text variant="large">Upload Dataset (CSV/XLSX)</Text>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          id="dataset-upload"
        />
        <DefaultButton
          text="Choose File"
          title="Only CSV and Excel files are supported"
          onClick={() => document.getElementById('dataset-upload')?.click()}
        />
        <Text>{currentDataset ? currentDataset.name : "No file selected"}</Text>
      </Stack>

      {/* Data preview */}
      {currentDataset && (
        <Stack.Item>
          <Label>Data Preview ({currentDataset.name})</Label>
          <DetailsList
            items={currentDataset.previewData}
            columns={currentDataset.columns.map(col => ({
              key: col,
              name: col,
              fieldName: col,
              minWidth: 100
            }))}
          />
        </Stack.Item>
      )}

      {/* Generate visualization button */}
      <PrimaryButton
        text="Generate Visualization"
        onClick={handleGenerateVisualization}
        disabled={isGenerating || !currentDataset}
      />
      
      {isGenerating && <Spinner label="Generating visualization..." />}

      {/* Add error message display */}
      {error && (
        <Text styles={{ root: { color: 'red' } }}>
          {error}
        </Text>
      )}
    </Stack>
  );
}; 