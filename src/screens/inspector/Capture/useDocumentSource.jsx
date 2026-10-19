import { useCallback, useState } from 'react';
import { OptionSheet } from '../../../components';
import { useT } from '../../../i18n';

// The sheet closes before the picker opens: on iOS a picker can't be
// presented while another modal is still closing.
const AFTER_SHEET_MS = 350;

// "Upload a document": a photo from the gallery or a PDF file (as the web
// accepts both).
//   const { chooseSource, sheet } = useDocumentSource();
//   chooseSource(source => upload(source));  ...render {sheet}
export default function useDocumentSource() {
  const t = useT();
  const [onChoose, setOnChoose] = useState(null);

  const chooseSource = useCallback(next => setOnChoose(() => next), []);

  const sheet = (
    <OptionSheet
      visible={!!onChoose}
      title={t('inspector.capture.docSource')}
      options={[
        { label: t('inspector.capture.docFromGallery'), value: 'gallery' },
        { label: t('inspector.capture.docPdf'), value: 'pdf' },
      ]}
      onSelect={source => {
        const run = onChoose;
        setTimeout(() => run?.(source), AFTER_SHEET_MS);
      }}
      onClose={() => setOnChoose(null)}
    />
  );

  return { chooseSource, sheet };
}
