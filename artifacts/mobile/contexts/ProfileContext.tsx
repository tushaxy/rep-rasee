import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setProfileIdGetter } from '@workspace/api-client-react';

interface ProfileContextValue {
  selectedProfileId: number | null;
  setSelectedProfileId: (id: number | null) => void;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  selectedProfileId: null,
  setSelectedProfileId: () => {},
  clearProfile: () => {},
});

const STORAGE_KEY = '@raseed_profile_id';

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [selectedProfileId, setSelectedProfileIdState] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val) {
        const id = parseInt(val, 10);
        if (!isNaN(id)) setSelectedProfileIdState(id);
      }
    });
  }, []);

  // Wire the profile ID into every API call automatically
  useEffect(() => {
    setProfileIdGetter(() => selectedProfileId ? String(selectedProfileId) : null);
  }, [selectedProfileId]);

  const setSelectedProfileId = useCallback((id: number | null) => {
    setSelectedProfileIdState(id);
    if (id != null) {
      AsyncStorage.setItem(STORAGE_KEY, String(id));
    } else {
      AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearProfile = useCallback(() => {
    setSelectedProfileId(null);
  }, [setSelectedProfileId]);

  return (
    <ProfileContext.Provider value={{ selectedProfileId, setSelectedProfileId, clearProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
