import { useCallback, useState } from 'react';
import { checkPhotoAngle } from '../../../api/services/valuation.api';
import { tNow } from '../../../i18n';

// Takes a photo, then asks the API whether it shows the right angle.
// status: 'idle' | 'capturing' | 'checking' | 'perfect' | 'incorrect'
// Returns the file when the angle is correct, otherwise null.
// flashOn must be false for cameras without a flash (e.g. the selfie camera).
export default function useAngleCapture({ photoOutput, angleKey, flashOn }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const capture = useCallback(async () => {
    setError('');
    setStatus('capturing');
    try {
      const { filePath } = await photoOutput.capturePhotoToFile(
        { flashMode: flashOn ? 'on' : 'off', enableShutterSound: true },
        {},
      );
      const file = {
        uri: filePath.startsWith('file://') ? filePath : `file://${filePath}`,
        fileName: `${angleKey}.jpg`,
        type: 'image/jpeg',
      };
      setStatus('checking');
      const result = await checkPhotoAngle({ angle: angleKey, file });
      setStatus(result.status === 'perfect' ? 'perfect' : 'incorrect');
      return result.status === 'perfect' ? file : null;
    } catch (e) {
      setStatus('idle');
      setError(e.message || tNow('valuation.camera.captureError'));
      return null;
    }
  }, [photoOutput, angleKey, flashOn]);

  // Back to the live preview (e.g. after an incorrect angle).
  const reset = useCallback(() => setStatus('idle'), []);

  return { status, error, capture, reset };
}
