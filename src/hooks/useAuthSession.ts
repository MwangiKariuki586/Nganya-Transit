import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { getProfile } from '@/lib/queries/profile';
import { reportAppError } from '@/shared/errors/reporting';

export function useAuthSession() {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchProfile = async (userId: string) => {
            const data = await getProfile(userId);
            if (isMounted) setProfile(data);
        };

        supabase.auth
            .getSession()
            .then(({ data: { session } }) => {
                if (isMounted) {
                    setSession(session);
                    if (session?.user) fetchProfile(session.user.id);
                }
            })
            .catch((error) => {
                if (!isMounted) return;
                setSession(null);
                setProfile(null);
                reportAppError(error, {
                    area: 'render',
                    action: 'use-auth-session:get-session',
                });
            });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted) {
                setSession(session);
                if (session?.user) {
                    fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                }
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return { session, profile };
}
