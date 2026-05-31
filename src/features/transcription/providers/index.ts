// Speech Provider Factory and exports

import type { SpeechProvider, SpeechProviderType } from './types';
import { BrowserSpeechProvider } from './BrowserSpeechProvider';
import { WhisperProvider } from './WhisperProvider';

export * from './types';
export { BrowserSpeechProvider } from './BrowserSpeechProvider';
export { WhisperProvider } from './WhisperProvider';

export function createSpeechProvider(
  type: SpeechProviderType,
  options?: { whisperApiKey?: string }
): SpeechProvider {
  switch (type) {
    case 'browser':
      return new BrowserSpeechProvider();
    case 'whisper':
      return new WhisperProvider(options?.whisperApiKey);
    case 'deepgram':
      // TODO: Implement Deepgram provider
      throw new Error('Deepgram provider not yet implemented');
    default:
      throw new Error(`Unknown speech provider: ${type}`);
  }
}
