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
    <Stack tokens={{ childrenGap: 20 }}>
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

      {/* Chart type selection */}
      <Stack>
        <Text variant="large">Chart Type</Text>
        <Dropdown
          placeholder="Select a chart type"
          options={chartTypes}
          selectedKey={visualizationConfig.chartType}
          onChange={(_, item) => item && updateConfig({ chartType: item.key as any })}
        />
      </Stack>
      
      {currentDataset?.columns && (
        <>
          <Dropdown
            label="X Axis"
            options={currentDataset.columns.map(c => ({ key: c, text: c }))}
            onChange={(_, item) => item && updateConfig({ xAxis: item.key as string })}
          />
          <Dropdown
            label="Y Axis"
            options={currentDataset.columns.map(c => ({ key: c, text: c }))}
            onChange={(_, item) => item && updateConfig({ yAxis: item.key as string })}
          />
        </>
      )}

      {/* Generate visualization button */}
      <PrimaryButton
        text="Generate Visualization"
        onClick={handleGenerateVisualization}
        disabled={isGenerating || !currentDataset}
      />
      
      {isGenerating && <Spinner label="Generating visualization..." />}

      {/* Result display */}
      {generatedImage && (
        <img 
          src={`data:image/png;base64,${generatedImage}`} 
          alt="Generated visualization"
          style={{ maxWidth: '100%', border: '1px solid #ddd' }}
        />
      )}

      {/* Add error message display */}
      {error && (
        <Text styles={{ root: { color: 'red' } }}>
          {error}
        </Text>
      )}
    </Stack>
  );
}; 