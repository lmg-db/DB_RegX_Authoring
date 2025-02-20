import * as React from 'react';
import { Stack, Text, Icon } from '@fluentui/react';

interface StatusIndicatorProps {
  status: 'uploading' | 'success' | 'error';
  progress?: number;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, progress }) => {
  const statusConfig = {
    uploading: { icon: 'ProgressRingDots', color: '#0078d4', text: 'Uploading' },
    success: { icon: 'CheckMark', color: '#107c10', text: 'Success' },
    error: { icon: 'ErrorBadge', color: '#a80000', text: 'Error' }
  };

  const config = statusConfig[status];

  return (
    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
      <Icon iconName={config.icon} styles={{ root: { color: config.color } }} />
      {status === 'uploading' && progress !== undefined && (
        <Text>{`${progress}%`}</Text>
      )}
      <Text>{config.text}</Text>
    </Stack>
  );
}; 