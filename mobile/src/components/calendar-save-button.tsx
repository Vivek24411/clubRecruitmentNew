import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { useFeedback } from '@/context/feedback-context';
import { apiRequest } from '@/lib/api';

export function CalendarSaveButton({ sourceType, sourceId }: { sourceType: 'event' | 'session'; sourceId: string }) {
  const { profile } = useAuth();
  const { toast } = useFeedback();
  const [saved, setSaved] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!profile || !sourceId) return;
    let active = true;
    void apiRequest<{ success: boolean; saved: boolean }>(`/student/calendar/status?sourceType=${sourceType}&sourceId=${encodeURIComponent(sourceId)}`)
      .then((response) => { if (active) setSaved(response.saved); })
      .catch(() => {});
    return () => { active = false; };
  }, [profile, sourceId, sourceType]);

  async function toggle() {
    if (!profile) {
      router.push('/login');
      return;
    }
    setWorking(true);
    try {
      const response = await apiRequest<{ success: boolean; saved: boolean; msg?: string }>('/student/calendar/items', {
        method: saved ? 'DELETE' : 'PUT', body: { sourceType, sourceId },
      });
      setSaved(response.saved);
      toast(response.msg || (response.saved ? 'Added to your calendar.' : 'Removed from your calendar.'), 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update your calendar.', 'error');
    } finally {
      setWorking(false);
    }
  }

  return <Button label={saved ? 'In your calendar' : 'Add to calendar'} variant={saved ? 'primary' : 'secondary'} icon={saved ? 'checkmark-circle-outline' : 'calendar-outline'} loading={working} onPress={() => void toggle()} />;
}
