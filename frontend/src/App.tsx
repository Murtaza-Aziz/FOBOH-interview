import { useState } from 'react';
import { ProfileBuilder } from './pages/ProfileBuilder';
import { ProfilesIndex } from './pages/ProfilesIndex';
import type { PricingProfile } from './types';

// Simple discriminated union for top-level navigation. No router needed at
// this scale — two views, managed with a useState.
type View =
  | { page: 'list' }
  | { page: 'builder'; profile: PricingProfile | null };

export function App() {
  const [view, setView] = useState<View>({ page: 'list' });

  const goList    = () => setView({ page: 'list' });
  const goNew     = () => setView({ page: 'builder', profile: null });
  const goEdit    = (p: PricingProfile) => setView({ page: 'builder', profile: p });

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title" onClick={goList}>FOBOH Pricing</span>
        {view.page === 'builder' && (
          <span className="breadcrumb">
            / {view.profile ? `Edit: ${view.profile.name}` : 'New Profile'}
          </span>
        )}
      </header>

      <main>
        {view.page === 'list' ? (
          <ProfilesIndex onNew={goNew} onEdit={goEdit} />
        ) : (
          <ProfileBuilder
            profile={view.profile}
            onSaved={goList}
            onCancel={goList}
          />
        )}
      </main>
    </div>
  );
}
