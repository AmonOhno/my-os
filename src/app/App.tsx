import { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { TodayScreen } from '../screens/TodayScreen';
import { ConnectionsScreen } from '../screens/ConnectionsScreen';
import { DomainScreen } from '../screens/DomainScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { RecordSheet } from '../screens/RecordSheet';
import { AppTabBar } from '../components/AppTabBar';
import { Fab } from '../components/Fab';

export function App() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TodayScreen />} />
        <Route path="/connections" element={<ConnectionsScreen />} />
        <Route path="/domain/:domain" element={<DomainScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      <Fab onClick={() => setSheetOpen(true)} />
      <AppTabBar />
      {sheetOpen && <RecordSheet onClose={() => setSheetOpen(false)} />}
    </HashRouter>
  );
}
