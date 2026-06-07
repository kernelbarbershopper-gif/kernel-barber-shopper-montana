import { useEffect, useState } from 'react';
import { getGlobalSettings } from '../services/dbService';

export const useMaintenance = () => {
  const [maintenance, setMaintenance] = useState(false);
  useEffect(() => {
    const load = async () => {
      try {
        const settings = await getGlobalSettings();
        setMaintenance(!settings.system_online);
      } catch (e) {
        console.error('Failed to load maintenance flag', e);
        setMaintenance(false);
      }
    };
    load();
  }, []);
  return maintenance;
};
