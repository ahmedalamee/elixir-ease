import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'pharmacist' | 'cashier' | 'inventory_manager';

export const useUserRole = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRoles([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching roles:', error);
          setRoles([]);
        } else {
          setRoles(data?.map(r => r.role as AppRole) || []);
        }
      } catch (error) {
        console.error('Error in fetchRoles:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  return {
    roles,
    loading,
    hasRole: (role: AppRole) => roles.includes(role),
    hasAnyRole: (checkRoles: AppRole[]) => checkRoles.some(role => roles.includes(role)),
    isAdmin: roles.includes('admin'),
    isPharmacist: roles.includes('pharmacist'),
    isCashier: roles.includes('cashier'),
    isInventoryManager: roles.includes('inventory_manager'),
  };
};
