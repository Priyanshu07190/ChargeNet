import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiService } from '../lib/apiService';
import { MongoCharger } from '../types';
import socketService from '../lib/socketService';

interface ChargerContextType {
  chargers: MongoCharger[];
  loading: boolean;
  fetchNearbyChargers: (lat: number, lng: number) => void;
  bookCharger: (chargerId: string, timeSlot: string) => Promise<void>;
  updateChargerAvailability: (chargerId: string, available: boolean) => void;
  isChargerBusyNow: (chargerId: string) => boolean;
  busyNowVersion: number;
}

const ChargerContext = createContext<ChargerContextType | undefined>(undefined);

export const ChargerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chargers, setChargers] = useState<MongoCharger[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyNowSet, setBusyNowSet] = useState<Set<string>>(new Set());
  const [busyNowVersion, setBusyNowVersion] = useState(0);
  const bookingTimersRef = useRef<Map<string, { start?: number; end?: number }>>(new Map());

  const addBusy = (chargerId: string) => {
    setBusyNowSet(prev => {
      if (prev.has(chargerId)) return prev;
      const next = new Set(prev);
      next.add(chargerId);
      // bump revision only when changed
      setBusyNowVersion(v => v + 1);
      return next;
    });
  };

  const removeBusy = (chargerId: string) => {
    setBusyNowSet(prev => {
      if (!prev.has(chargerId)) return prev;
      const next = new Set(prev);
      next.delete(chargerId);
      // bump revision only when changed
      setBusyNowVersion(v => v + 1);
      return next;
    });
  };

  const clearBookingTimers = (bookingId: string) => {
    const timers = bookingTimersRef.current.get(bookingId);
    if (timers) {
      if (timers.start) clearTimeout(timers.start);
      if (timers.end) clearTimeout(timers.end);
      bookingTimersRef.current.delete(bookingId);
    }
  };

  const scheduleBusyForBooking = (booking: any) => {
    // Expect booking to have: _id, charger_id, start_time, end_time, status
    const bookingId: string = booking._id || booking.id;
    const chargerId: string = booking.charger_id?._id || booking.charger_id;
    if (!bookingId || !chargerId) return;

    // Clear previous timers for this booking
    clearBookingTimers(bookingId);

    const status = booking.status;
    if (status === 'cancelled') {
      removeBusy(chargerId);
      return;
    }

    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time || new Date(new Date(booking.start_time).getTime() + (booking.duration || 60) * 60000));
    const now = new Date();

    const timers: { start?: number; end?: number } = {};

    if (now < start) {
      // Will become busy in the future
      timers.start = window.setTimeout(() => {
        addBusy(chargerId);
      }, start.getTime() - now.getTime());

      // Also schedule end to clear busy
      timers.end = window.setTimeout(() => {
        removeBusy(chargerId);
      }, end.getTime() - now.getTime());
    } else if (now >= start && now < end) {
      // Currently busy
      addBusy(chargerId);
      timers.end = window.setTimeout(() => {
        removeBusy(chargerId);
      }, end.getTime() - now.getTime());
    } else {
      // Past booking window
      removeBusy(chargerId);
    }

    bookingTimersRef.current.set(bookingId, timers);
  };

  // Set up WebSocket listeners for real-time updates
  useEffect(() => {
    console.log('🔌 ChargerContext: Setting up WebSocket listeners');
    
    // Connect to WebSocket
    socketService.connect();

    // Listen for charger availability changes
    const handleChargerAvailabilityChanged = (data: {
      charger_id: string;
      available: boolean;
      status: string;
    }) => {
      console.log('🔌 ChargerContext: Received charger availability change:', data);
      updateChargerAvailability(data.charger_id, data.available);
    };

    // Listen for charger list changes (add/delete)
    const handleChargerListChanged = (data: {
      type: 'charger-added' | 'charger-deleted';
      charger?: any;
      charger_id?: string;
    }) => {
      console.log('🔌 ChargerContext: Received charger list change:', data);
      
      if (data.type === 'charger-added' && data.charger) {
        // Add new charger to the list
        setChargers(prev => {
          // Check if charger already exists to avoid duplicates
          const exists = prev.some(c => c._id === data.charger._id);
          if (!exists) {
            return [...prev, data.charger];
          }
          return prev;
        });
      } else if (data.type === 'charger-deleted' && data.charger_id) {
        // Remove deleted charger from the list
        setChargers(prev => prev.filter(c => c._id !== data.charger_id));
      }
    };

    // Set up WebSocket event listeners
    socketService.onChargerAvailabilityChanged(handleChargerAvailabilityChanged);
    socketService.onChargerListChanged(handleChargerListChanged);
    // Listen for booking changes to drive busy-now state
    const handleBookingListChanged = (data: {
      type: 'booking-created' | 'booking-updated';
      booking: any;
      previous_status?: string;
      new_status?: string;
    }) => {
      try {
        if (!data?.booking) return;
        scheduleBusyForBooking(data.booking);
      } catch (e) {
        console.warn('⚠️ Failed to process booking-list-changed event', e);
      }
    };
    socketService.onBookingListChanged(handleBookingListChanged);

    // Cleanup function
    return () => {
      console.log('🔌 ChargerContext: Cleaning up WebSocket listeners');
      socketService.offChargerAvailabilityChanged(handleChargerAvailabilityChanged);
      socketService.offChargerListChanged(handleChargerListChanged);
      socketService.offBookingListChanged();
      // Clear any timers
      bookingTimersRef.current.forEach((t) => {
        if (t.start) clearTimeout(t.start);
        if (t.end) clearTimeout(t.end);
      });
      bookingTimersRef.current.clear();
    };
  }, []);

  // Seed busy-now state on mount from current bookings
  useEffect(() => {
    const seedBusy = async () => {
      try {
        const all = await apiService.getBookings();
        const now = new Date();
        const active = (all || []).filter((b: any) => {
          if (b.status === 'cancelled') return false;
          const start = new Date(b.start_time);
          const end = new Date(b.end_time || new Date(new Date(b.start_time).getTime() + (b.duration || 60) * 60000));
          return now >= start && now < end;
        });
        const next = new Set<string>();
        active.forEach((b: any) => {
          const cid = b.charger_id?._id || b.charger_id;
          if (cid) next.add(cid);
          // Also schedule end clears for each
          scheduleBusyForBooking(b);
        });
  setBusyNowSet(next);
  setBusyNowVersion(v => v + 1);
      } catch (e) {
        console.warn('⚠️ Failed to seed busy-now state from bookings', e);
      }
    };
    seedBusy();
  }, []);

  const fetchNearbyChargers = async (_lat: number, _lng: number) => {
    setLoading(true);
    try {
      // For now, fetch all chargers and filter on frontend
      // TODO: Update backend to support location-based filtering
      const fetchedChargers = await apiService.getChargers();
      setChargers(fetchedChargers);
    } catch (error) {
      console.error('Error fetching chargers:', error);
    } finally {
      setLoading(false);
    }
  };

  const bookCharger = async (chargerId: string, _timeSlot: string) => {
    // This function is now primarily for optimistic UI updates.
    // The actual booking is handled in Booking.tsx.
    try {
      setChargers(prev => 
        prev.map(charger => 
          charger._id === chargerId 
            ? { ...charger, available: false }
            : charger
        )
      );
    } catch (error) {
      console.error('Error updating local charger state:', error);
    }
  };

  // Real-time update function for WebSocket events
  const updateChargerAvailability = (chargerId: string, available: boolean) => {
    setChargers(prev => 
      prev.map(charger => 
        charger._id === chargerId 
          ? { ...charger, available, status: available ? 'active' : 'offline' }
          : charger
      )
    );
  };

  const isChargerBusyNow = (chargerId: string) => busyNowSet.has(chargerId);

  return (
  <ChargerContext.Provider value={{ chargers, loading, fetchNearbyChargers, bookCharger, updateChargerAvailability, isChargerBusyNow, busyNowVersion }}>
      {children}
    </ChargerContext.Provider>
  );
};

export const useCharger = () => {
  const context = useContext(ChargerContext);
  if (context === undefined) {
    throw new Error('useCharger must be used within a ChargerProvider');
  }
  return context;
};