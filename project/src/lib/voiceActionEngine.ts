/**
 * Voice Action Engine - Makes Gennie a full app controller like Alexa
 * 
 * All navigation uses URL-based approach with ?tab=X params.
 * GenniePro adds _t= timestamp to force React Router to detect changes.
 */
import { NavigateFunction } from 'react-router-dom';
import { apiService } from './apiService';
import { dataService, Charger } from './dataService';

// ============ Types ============

export interface VoiceActionContext {
  userId: string;
  userName: string;
  userType: 'driver' | 'host';
  currentRoute: string;
  navigate: NavigateFunction;
}

export interface ActionResult {
  spoken: string;        // What Gennie says
  navigateTo?: string;   // Route for CROSS-PAGE navigation only (diff page)
  data?: any;            // Any data fetched
}

// ============ Helpers ============

/** Returns the dashboard URL with /tab for the current user type */
function goToTab(tab: string, context: VoiceActionContext): string {
  const dashPath = context.userType === 'host' ? '/host-dashboard' : '/dashboard';
  return `${dashPath}/${tab}`;
}

/**
 * Execute a parsed action from Gemini's response.
 */
export async function executeAction(
  action: string,
  value: string | undefined,
  context: VoiceActionContext
): Promise<ActionResult> {
  console.log('🎬 Voice Action Engine executing:', action, value);

  switch (action) {
    // ===== CROSS-PAGE NAVIGATION =====
    case 'FIND_CHARGERS':
      return {
        spoken: "Opening the charger map for you! Let me find available chargers nearby.",
        navigateTo: '/chargers',
      };

    case 'PROFILE':
      return {
        spoken: "Opening your profile.",
        navigateTo: '/profile',
      };

    // ===== DASHBOARD HOME =====
    case 'DASHBOARD':
      return {
        spoken: "Taking you to your dashboard.",
        navigateTo: goToTab('overview', context) || (context.userType === 'host' ? '/host-dashboard' : '/dashboard'),
      };

    // ===== TAB NAVIGATION (same-page, event-driven) =====
    case 'VIEW_BOOKINGS':
      return {
        spoken: "Here are your bookings.",
        navigateTo: goToTab('bookings', context),
      };

    case 'MY_BOOKINGS':
      return context.userType === 'host'
        ? { spoken: "Here are your personal bookings as a driver.", navigateTo: goToTab('my-bookings', context) }
        : { spoken: "Here are your bookings.", navigateTo: goToTab('bookings', context) };

    // ===== TRIP PLANNING =====
    case 'PLAN_TRIP': {
      if (value && value.includes('|')) {
        const [from, to] = value.split('|').map(s => s.trim());
        return {
          spoken: `Planning your trip from ${from} to ${to}. Let me find charging stations along the route!`,
          navigateTo: `/chargers?trip=1&startType=custom&start=${encodeURIComponent(from)}&dest=${encodeURIComponent(to)}`,
        };
      }
      return {
        spoken: "Opening the trip planner. Tell me your start and destination!",
        navigateTo: goToTab('trip-planner', context),
      };
    }

    // ===== BOOKING =====
    case 'BOOK_CHARGER': {
      if (value) {
        try {
          const chargers = await dataService.getChargers();
          const match = findBestChargerMatch(chargers, value);
          if (match) {
            return {
              spoken: `Found "${match.name}" at ${match.location}. It's ${match.power}kW, ₹${match.price}/unit. ${match.available ? 'Available now!' : 'Currently busy.'} Taking you to book it.`,
              navigateTo: `/booking/${match._id}`,
              data: match,
            };
          } else {
            return {
              spoken: `I couldn't find a charger matching "${value}". Let me show all chargers so you can pick one.`,
              navigateTo: '/chargers',
            };
          }
        } catch {
          return { spoken: "Let me open the charger list so you can pick one to book.", navigateTo: '/chargers' };
        }
      }
      return { spoken: "Opening the charger map. Tell me which charger you'd like to book!", navigateTo: '/chargers' };
    }

    case 'CANCEL_BOOKING': {
      try {
        const bookings = await apiService.getDriverBookings();
        const active = bookings.filter((b: any) => b.status === 'pending' || b.status === 'active');
        if (active.length === 0) {
          return { spoken: "You don't have any active bookings to cancel." };
        }
        const target = value
          ? active.find((b: any) => b._id === value) || active[0]
          : active[0];
        await apiService.cancelBooking(target._id);
        return {
          spoken: `Booking cancelled successfully! ${active.length > 1 ? `You still have ${active.length - 1} other active bookings.` : ''}`,
          navigateTo: goToTab('bookings', context),
        };
      } catch {
        return { spoken: "I couldn't cancel the booking. Please try from the bookings page." };
      }
    }

    // ===== EMERGENCY =====
    case 'EMERGENCY':
      return {
        spoken: "Emergency mode activated! I'm finding rescue help near you right now. Stay safe!",
        navigateTo: goToTab('emergency-rescue', context),
      };

    // ===== URGENT =====
    case 'URGENT_BOOKING':
      return {
        spoken: "Opening urgent booking! I'll find you the fastest available charger.",
        navigateTo: goToTab('urgent', context),
      };

    // ===== CARBON CREDITS =====
    case 'CARBON_CREDITS':
      return {
        spoken: "Opening carbon credits trading. You can sell your eco miles here!",
        navigateTo: goToTab('carbon-trading', context),
      };

    case 'ADD_DISTANCE': {
      const km = parseInt(value || '0');
      if (km > 0) {
        return {
          spoken: `Great! ${km} kilometers added. That's about ${(km * 0.12).toFixed(1)} kg of CO2 saved — earning you carbon credits!`,
          navigateTo: goToTab('carbon-trading', context),
        };
      }
      return { spoken: "How many kilometers did you drive? Just tell me the number." };
    }

    // ===== REWARDS =====
    case 'REWARDS':
      return {
        spoken: "Opening your rewards exchange!",
        navigateTo: goToTab('rewards', context),
      };

    // ===== ANALYTICS =====
    case 'ANALYTICS':
      return {
        spoken: "Here's your charging analytics and usage data.",
        navigateTo: goToTab('analytics', context),
      };

    // ===== SUPPORT =====
    case 'SUPPORT':
      return {
        spoken: "Opening support. How can I help you?",
        navigateTo: goToTab('support', context),
      };

    // ===== HOST ACTIONS =====
    case 'ADD_CHARGER':
      if (context.userType !== 'host') {
        return { spoken: "Only hosts can add chargers. Would you like to switch to a host account?" };
      }
      return {
        spoken: "Opening the add charger form. Fill in your charger details!",
        navigateTo: goToTab('chargers', context),
      };

    case 'MANAGE_CHARGERS':
      if (context.userType !== 'host') {
        return { spoken: "Only hosts can manage chargers." };
      }
      return {
        spoken: "Here are your listed chargers.",
        navigateTo: goToTab('chargers', context),
      };

    case 'RESCUE_REQUESTS':
      if (context.userType !== 'host') {
        return { spoken: "Rescue requests are for hosts. As a driver, you can request emergency rescue instead." };
      }
      return {
        spoken: "Here are the incoming rescue requests from nearby drivers.",
        navigateTo: goToTab('rescue-requests', context),
      };

    case 'HOST_BOOKINGS':
      if (context.userType !== 'host') {
        return { spoken: "That's for hosts. Let me show your driver bookings instead.", navigateTo: goToTab('bookings', context) };
      }
      return {
        spoken: "Here are the bookings on your chargers.",
        navigateTo: goToTab('bookings', context),
      };

    case 'REQUEST_CHARGER':
      return {
        spoken: "Opening the charger request form. You can request a charger installation in your area!",
        navigateTo: goToTab('request-charger', context),
      };

    // ===== DATA READS =====
    case 'LIST_CHARGERS': {
      try {
        const chargers = await dataService.getChargers();
        const available = chargers.filter(c => c.available);
        if (available.length === 0) {
          return { spoken: "No chargers are currently available. Check back soon!" };
        }
        const top3 = available.slice(0, 3);
        const list = top3.map((c, i) =>
          `${i + 1}. ${c.name} at ${c.location}, ${c.power}kW, ₹${c.price} per unit, rated ${c.rating} stars`
        ).join('. ');
        return {
          spoken: `I found ${available.length} available chargers. Here are the top ones: ${list}. Want me to book any of these?`,
          data: top3,
        };
      } catch {
        return { spoken: "I'm having trouble fetching chargers. Let me open the map for you.", navigateTo: '/chargers' };
      }
    }

    case 'CHARGER_STATUS': {
      try {
        const chargers = await dataService.getChargers();
        const available = chargers.filter(c => c.available).length;
        const total = chargers.length;
        return {
          spoken: `There are ${total} chargers in the network. ${available} are available right now and ${total - available} are busy.`,
        };
      } catch {
        return { spoken: "I couldn't fetch charger status right now." };
      }
    }

    case 'BOOKING_STATUS': {
      try {
        const bookings = context.userType === 'host'
          ? await apiService.getHostPersonalBookings()
          : await apiService.getDriverBookings();
        const active = bookings.filter((b: any) => b.status === 'active' || b.status === 'pending');
        if (active.length === 0) {
          return { spoken: "You don't have any active bookings right now." };
        }
        const latest = active[0];
        return {
          spoken: `You have ${active.length} active booking${active.length > 1 ? 's' : ''}. Your latest is ${latest.status} for ${latest.duration || 1} hour${latest.duration > 1 ? 's' : ''}, costing ₹${latest.amount}.`,
        };
      } catch {
        return { spoken: "I couldn't fetch your bookings right now." };
      }
    }

    case 'TOGGLE_CHARGER': {
      if (context.userType !== 'host') {
        return { spoken: "Only hosts can toggle charger availability." };
      }
      try {
        const hostChargers = await apiService.getHostChargers();
        if (!hostChargers || hostChargers.length === 0) {
          return { spoken: "You don't have any chargers listed yet.", navigateTo: goToTab('chargers', context) };
        }

        let match: any = null;

        if (value && value.toLowerCase() !== 'all') {
          // Try to find by name or location
          match = hostChargers.find((c: any) =>
            c.name.toLowerCase().includes(value.toLowerCase()) ||
            c.location.toLowerCase().includes(value.toLowerCase())
          );
        }

        // If no specific match and host has only 1 charger, use that one
        if (!match && hostChargers.length === 1) {
          match = hostChargers[0];
        }

        if (match) {
          const chargerId = match._id || match.id;
          await apiService.toggleChargerAvailability(chargerId);
          const newStatus = match.available ? 'offline' : 'online';
          return {
            spoken: `Done! "${match.name}" is now ${newStatus}.`,
            navigateTo: goToTab('chargers', context),
          };
        } else if (value && value.toLowerCase() !== 'all') {
          return {
            spoken: `I couldn't find a charger matching "${value}". Let me show your chargers.`,
            navigateTo: goToTab('chargers', context),
          };
        } else {
          // Multiple chargers, no specific one requested
          const names = hostChargers.map((c: any) => c.name).join(', ');
          return {
            spoken: `You have ${hostChargers.length} chargers: ${names}. Which one should I toggle?`,
            navigateTo: goToTab('chargers', context),
          };
        }
      } catch {
        return { spoken: "I couldn't toggle that charger. Please try from the dashboard." };
      }
    }

    default:
      return { spoken: '' };
  }
}

// ============ Fuzzy Charger Match ============

function findBestChargerMatch(chargers: Charger[], query: string): Charger | null {
  const q = query.toLowerCase();
  let match = chargers.find(c => c.name.toLowerCase() === q);
  if (match) return match;
  match = chargers.find(c => c.name.toLowerCase().includes(q));
  if (match) return match;
  match = chargers.find(c => c.location.toLowerCase().includes(q));
  if (match) return match;
  const words = q.split(/\s+/);
  match = chargers.find(c => {
    const combined = `${c.name} ${c.location}`.toLowerCase();
    return words.every(w => combined.includes(w));
  });
  return match || null;
}
