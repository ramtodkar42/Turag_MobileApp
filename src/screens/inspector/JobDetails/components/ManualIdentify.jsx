import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, SelectField, TextField } from '../../../../components';
import { spacing } from '../../../../theme';
import { useT } from '../../../../i18n';
import { makesFor, modelsFor } from '../../../home/Home/filterCatalog';
import { FUELS } from '../../constants';

// "Something else": type the make / model when it isn't in the list.
const OTHER = '__other__';
const THIS_YEAR = new Date().getFullYear();

const validYear = text => {
  const year = Number(text);
  return Number.isInteger(year) && year >= 1980 && year <= THIS_YEAR + 1;
};

// "Or identify manually" (as the web's): the make, model, year and fuel of the
// vehicle when its RC can't be matched. Makes / models come from the app's
// catalogue for the job's vehicle type, or are typed (fuel is needed then, so
// the backend can add an unlisted model). onSubmit({ make, model, year, fuel }).
function ManualIdentify({ category, busy, onSubmit, style }) {
  const t = useT();
  const vehicle = category === 'TWO_WHEELER' ? 'bikes' : 'cars';
  const [make, setMake] = useState(null);
  const [makeText, setMakeText] = useState('');
  const [model, setModel] = useState(null);
  const [modelText, setModelText] = useState('');
  const [year, setYear] = useState('');
  const [fuel, setFuel] = useState(null);

  const other = { value: OTHER, label: t('inspector.manual.other') };
  const makeValue = make === OTHER ? makeText.trim() : make ?? '';
  const typedMake = make === OTHER;
  const modelValue = typedMake || model === OTHER ? modelText.trim() : model ?? '';
  const yearError = year !== '' && !validYear(year) ? t('inspector.manual.yearInvalid') : undefined;
  const ready = !!makeValue && !!modelValue && !yearError;

  return (
    <View style={style}>
      <AppText variant="subtitle" style={styles.text}>
        {t('inspector.manual.hint')}
      </AppText>
      <SelectField
        label={t('inspector.identity.make')}
        value={make}
        options={[...makesFor(vehicle), other]}
        onChange={value => {
          setMake(value);
          setModel(null);
        }}
        style={styles.field}
      />
      {typedMake ? (
        <TextField
          label={t('inspector.manual.makeTyped')}
          placeholder={t('inspector.manual.makePlaceholder')}
          value={makeText}
          onChangeText={setMakeText}
          maxLength={60}
          style={styles.field}
        />
      ) : null}
      {make && !typedMake ? (
        <SelectField
          label={t('inspector.identity.model')}
          value={model}
          options={[...modelsFor({ vehicle, make }), other]}
          onChange={setModel}
          style={styles.field}
        />
      ) : null}
      {typedMake || model === OTHER ? (
        <TextField
          label={t('inspector.manual.modelTyped')}
          placeholder={t('inspector.manual.modelPlaceholder')}
          value={modelText}
          onChangeText={setModelText}
          maxLength={60}
          style={styles.field}
        />
      ) : null}
      <TextField
        label={t('inspector.identity.year')}
        placeholder={t('inspector.manual.yearPlaceholder')}
        value={year}
        onChangeText={text => setYear(text.replace(/\D/g, ''))}
        keyboardType="number-pad"
        maxLength={4}
        optional
        error={yearError}
        style={styles.field}
      />
      <SelectField
        label={t('inspector.identity.fuel')}
        value={fuel}
        options={FUELS.map(code => ({ value: code, label: t(`marketplace.fuel.${code}`) }))}
        onChange={setFuel}
        style={styles.field}
      />
      <Button
        title={t('inspector.manual.start')}
        size="md"
        onPress={() => onSubmit({ make: makeValue, model: modelValue, year, fuel })}
        disabled={!ready}
        loading={busy}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    marginTop: spacing.sm,
  },
  field: {
    marginTop: spacing.md,
  },
  button: {
    marginTop: spacing.md,
  },
});

export default ManualIdentify;
