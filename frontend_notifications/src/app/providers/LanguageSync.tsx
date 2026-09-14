import { useEffect } from 'react';

import i18n from '../../i18n/i18n';
import { useAppSelector } from '../store';

export function LanguageSync() {
  const language = useAppSelector((state) => state.preferences.language);

  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language]);

  return null;
}
