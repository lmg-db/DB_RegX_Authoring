import * as React from 'react';
import { Dialog, DialogType, DialogFooter, PrimaryButton, DefaultButton, TextField, Dropdown, IDropdownOption, Stack, Spinner, IconButton } from '@fluentui/react';

interface TranslationDialogProps {
  isOpen: boolean;
  onDismiss: () => void;
  defaultText: string;
  onTranslate: (text: string, targetLanguage: string) => Promise<string>;
}

export const TranslationDialog: React.FC<TranslationDialogProps> = ({
  isOpen,
  onDismiss,
  defaultText,
  onTranslate
}) => {
  const [targetLanguage, setTargetLanguage] = React.useState('zh-CN');
  const [translatedText, setTranslatedText] = React.useState('');
  const [isTranslating, setIsTranslating] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && defaultText) {
      handleTranslate();
    }
  }, [isOpen, defaultText]);

  const languageOptions: IDropdownOption[] = [
    { key: 'zh-CN', text: 'Chinese (Simplified)' },
    { key: 'en', text: 'English' },
    { key: 'ja', text: 'Japanese' },
    { key: 'ko', text: 'Korean' }
  ];

  const handleTranslate = async () => {
    if (!defaultText.trim()) return;
    
    setIsTranslating(true);
    setTranslatedText('');
    try {
      const result = await onTranslate(defaultText, targetLanguage);
      setTranslatedText(result);
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <Dialog
      hidden={!isOpen}
      onDismiss={onDismiss}
      dialogContentProps={{
        type: DialogType.normal,
        title: 'Translation',
        styles: {
          title: {
            padding: '8px 12px',
            fontSize: '18px'
          },
          subText: {
            display: 'none'
          },
          inner: {
            padding: '0 !important'
          }
        }
      }}
      modalProps={{
        isBlocking: false,
        dragOptions: undefined,
        styles: { 
          main: { 
            maxWidth: 380,
            minHeight: 'auto'
          },
          scrollableContent: {
            padding: '0 !important'
          }
        }
      }}
    >
      <Stack tokens={{ childrenGap: 8 }} styles={{
        root: {
          padding: '0 12px',
          height: '100%'
        }
      }}>
        <Stack.Item align="end">
          <IconButton
            iconProps={{ iconName: 'Cancel' }}
            onClick={onDismiss}
            styles={{
              root: {
                position: 'absolute',
                top: '8px',
                right: '8px',
                height: '28px',
                width: '28px'
              },
              icon: {
                fontSize: '12px',
                color: '#666'
              }
            }}
          />
        </Stack.Item>

        <Dropdown
          label="Target Language"
          selectedKey={targetLanguage}
          options={languageOptions}
          styles={{
            root: {
              marginBottom: '2px'
            },
            dropdown: {
              height: '32px'
            },
            title: {
              height: '32px',
              lineHeight: '30px',
              borderColor: '#e1e1e1'
            },
            label: {
              padding: '4px 0',
              fontSize: '13px'
            }
          }}
          onChange={(_, option) => {
            if (option) {
              setTargetLanguage(option.key as string);
              setTranslatedText('');
              handleTranslate();
            }
          }}
        />
        {isTranslating ? (
          <Stack horizontalAlign="center" verticalAlign="center" styles={{
            root: {
              height: '150px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px'
            }
          }}>
            <Spinner 
              label="Translating..." 
              styles={{
                root: { padding: '12px' },
                label: { color: '#0078d4' }
              }}
            />
          </Stack>
        ) : (
          translatedText && (
            <TextField
              multiline
              autoAdjustHeight
              resizable={false}
              value={translatedText}
              readOnly
              styles={{
                root: {
                  height: 'auto',
                  marginTop: '4px',
                  marginBottom: '12px'
                },
                field: {
                  backgroundColor: '#f8f9fa',
                  padding: '8px 12px',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  minHeight: '120px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  wordBreak: 'break-word',
                  '&::-webkit-scrollbar': {
                    width: '6px'
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#f1f1f1',
                    borderRadius: '3px'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#c8c8c8',
                    borderRadius: '3px',
                    '&:hover': {
                      background: '#a6a6a6'
                    }
                  }
                },
                fieldGroup: {
                  height: '100%',
                  border: '1px solid #e1e1e1',
                  borderRadius: '4px',
                  '&:hover': {
                    border: '1px solid #e1e1e1',
                    boxShadow: 'none'
                  }
                },
                wrapper: {
                  height: 'auto',
                  margin: '0 0 12px 0'
                }
              }}
            />
          )
        )}
      </Stack>
    </Dialog>
  );
}; 