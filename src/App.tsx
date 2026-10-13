import React, { useState, useEffect, useMemo } from 'react';
import { db as firestoreDb, auth } from './firebase'; 
import { collection, onSnapshot, query, where, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'; 
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut } from 'firebase/auth';

// --- i18n Dictionary ---
const TRANSLATIONS: any = {
  en: {
    app_title: 'Noticeboard', login: 'Log In', signup: 'Sign Up', phone_number: 'Phone Number',
    home: 'Home', announcements: 'Announcements', issues: 'Issues', events: 'Events', 
    lost_found: 'Lost & Found', admin: 'Admin', logout: 'Log Out',
    new_announcement: 'New Announcement', title: 'Title', content: 'Content', category: 'Category', post: 'Post',
    report_issue: 'Report Issue', status: 'Status', priority: 'Priority', confidential: 'Confidential', submit: 'Submit',
    empty_state: 'No items found.', loading: 'Loading...', search: 'Search...',
    access_pending: 'Your account is pending admin approval.',
    lost: 'Lost', found: 'Found', report_lost_found: 'Report Item', item_type: 'Type', date: 'Date', location: 'Location',
    contact_owner: 'Message Owner', claimed: 'Claimed', returned: 'Returned', mark_returned: 'Mark as Returned',
    rsvp: 'RSVP', going: 'Going', maybe: 'Maybe', not_going: 'Not Going', waitlist: 'Join Waitlist', full: 'Full',
    capacity: 'Capacity', seats_left: 'seats left', deadline: 'RSVP Deadline', attendees: 'Attendees',
    emergency_alert: 'EMERGENCY ALERT', acknowledge: 'I am safe / I have seen this', create_alert: 'Issue Emergency Alert',
    severity: 'Severity', alert_type: 'Alert Type', resolve_alert: 'Resolve Alert', confirm_action: 'Click again to confirm',
    translated_from: 'Translated from', view_original: 'View Original', translate: 'Translate',
    facilities: 'Facilities', book_facility: 'Book Facility', capacity_limit: 'Max Capacity', rules: 'Rules',
    time_slot: 'Time Slot', book_now: 'Book Now', booking_confirmed: 'Confirmed', cancel_booking: 'Cancel Booking',
    help_exchange: 'Help Exchange', offer_help: 'Offer Help', request_help: 'Request Help', donation_drive: 'Donation Drive',
    volunteers_needed: 'Volunteers Needed', progress: 'Progress', volunteer_now: 'Volunteer',
    analytics: 'Analytics', total_issues: 'Total Issues', avg_response: 'Avg Response Time', active_users: 'Active Users',
    privacy_settings: 'Privacy Settings', profile_visibility: 'Profile Visibility', everyone: 'Everyone', verified_only: 'Verified Only',
    staff_only: 'Staff Only', download_data: 'Download My Data', delete_account: 'Delete Account', hotspot: 'Hotspot Detected',
    forum: 'Forum', map: 'Community Map', polls: 'Polls', vote: 'Vote', new_thread: 'New Thread', marker_amenity: 'Amenity', marker_safety: 'Safety'
  },
  ta: {
    app_title: 'அறிவிப்பு பலகை', login: 'உள்நுழைக', phone_number: 'தொலைபேசி எண்',
    home: 'முகப்பு', announcements: 'அறிவிப்புகள்', issues: 'பிரச்சனைகள்', events: 'நிகழ்வுகள்', facilities: 'வசதிகள்', help_exchange: 'உதவி பரிமாற்றம்',
    lost_found: 'காணாமல் போனவை', admin: 'நிர்வாகி', logout: 'வெளியேறு',
    empty_state: 'எதுவும் கிடைக்கவில்லை.', search: 'தேடு...',
    lost: 'காணவில்லை', found: 'கண்டெடுக்கப்பட்டது', rsvp: 'பதிலளி', going: 'போகிறேன்', waitlist: 'காத்திருப்போர் பட்டியல்',
    emergency_alert: 'அவசர எச்சரிக்கை', acknowledge: 'நான் பாதுகாப்பாக உள்ளேன்', translated_from: 'மொழிபெயர்க்கப்பட்டது',
    forum: 'மன்றம்', map: 'வரைபடம்', polls: 'வாக்கெடுப்புகள்'
  },
  hi: {
    app_title: 'सूचना पट', login: 'लॉग इन करें', phone_number: 'फ़ोन नंबर',
    home: 'होम', announcements: 'घोषणाएँ', issues: 'समस्याएं', events: 'आयोजन', facilities: 'सुविधाएं', help_exchange: 'मदद',
    lost_found: 'खोया और पाया', admin: 'व्यवस्थापक', logout: 'लॉग आउट',
    empty_state: 'कुछ नहीं मिला।', search: 'खोजें...',
    lost: 'खो गया', found: 'मिल गया', rsvp: 'उत्तर दें', going: 'जा रहा हूँ', waitlist: 'प्रतीक्षा सूची',
    emergency_alert: 'आपातकालीन चेतावनी', acknowledge: 'मैं सुरक्षित हूँ', translated_from: 'से अनुवादित',
    forum: 'मंच', map: 'नक्शा', polls: 'मतदान'
  }
};

const Icon = ({ name, className = "w-5 h-5", onClick }: { name: string, className?: string, onClick?: () => void }) => {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
    alert: <><polygon points="12 2 22 22 2 22 12 2"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="12" y1="18" x2="12.01" y2="18"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    sun: <><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></>,
    moon: <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></>,
    pin: <><path d="M21.1 16.3l-8.5-8.5a1.5 1.5 0 0 0-2.1 2.1l2.6 2.6L4.7 20.9a1 1 0 0 0 1.4 1.4l8.4-8.4 2.6 2.6a1.5 1.5 0 0 0 2.1-2.1l-1.9-1.9 3.8-3.8a1 1 0 0 0-1.4-1.4z"/></>,
    box: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></>,
    message: <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></>,
    map_outline: <><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></>,
    forum_chat: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></>,
    poll_pie: <><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></>,
    settings: <><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></>,
    key: <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></>,
    heart: <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></>
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} onClick={onClick}>
      {paths[name] || paths['alert']}
    </svg>
  );
};

const INITIAL_DB: any = {
  communities: [{ id: 'c1', name: 'Marina Breeze Apartments', timezone: 'Asia/Kolkata' }],
  users: [],
  announcements: [],
  issues: [],
  events: [],
  lost_found_items: [],
  event_registrations: [],
  emergency_alerts: [],
  alert_acknowledgments: [],
  reports: [], auditLogs: [],
  facilities: [
    { id: 'f1', community_id: 'c1', name: 'Clubhouse', capacity: 50, rules: 'No loud music after 9 PM. Clean up after use.', open_time: '08:00', close_time: '22:00', slot_length: 60, max_monthly_bookings: 4 },
    { id: 'f2', community_id: 'c1', name: 'Tennis Court', capacity: 4, rules: 'Proper sports shoes required.', open_time: '06:00', close_time: '20:00', slot_length: 60, max_monthly_bookings: 8 }
  ],
  facility_bookings: [],
  help_posts: [],
  forum_threads: [],
  map_markers: [
    { id: 'm1', community_id: 'c1', type: 'amenity', lat: 20, lng: 50, title: 'Clubhouse', description: 'Main recreational area.' },
    { id: 'm2', community_id: 'c1', type: 'safety', lat: 80, lng: 80, title: 'Assembly Point A', description: 'Fire assembly point for Block A.' }
  ],
  polls: [],
  poll_votes: []
};

export default function App() {
  const [db, setDb] = useState<any>(INITIAL_DB);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [theme, setTheme] = useState<string>('light');
  const [lang, setLang] = useState<string>('en');
  
  // UI States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showNewAnnouncement, setShowNewAnnouncement] = useState<boolean>(false);
  const [showNewThread, setShowNewThread] = useState<boolean>(false);
  const [showNewHelp, setShowNewHelp] = useState<boolean>(false);
  
  // Phase 2 Modals
  const [showNewIssue, setShowNewIssue] = useState<boolean>(false);
  const [showNewEvent, setShowNewEvent] = useState<boolean>(false);
  const [showNewItem, setShowNewItem] = useState<boolean>(false);

  const [otpRequested, setOtpRequested] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const t = (key: string): string => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key] || key;
  const isDark = theme === 'dark';

  useEffect(() => { document.documentElement.className = theme; }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userSnap = await getDoc(doc(firestoreDb, 'users', firebaseUser.uid));
        if (userSnap.exists()) {
          setCurrentUser(userSnap.data());
          setLang(userSnap.data().lang || 'en');
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const unsubAnnouncements = onSnapshot(query(collection(firestoreDb, 'announcements'), where('community_id', '==', currentUser.community_id)), (snapshot) => {
      setDb((prev: any) => ({ ...prev, announcements: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    }, (error) => { alert("🔥 Firebase Read Error: " + error.message); });

    const unsubBookings = onSnapshot(collection(firestoreDb, 'facility_bookings'), (snapshot) => {
      setDb((prev: any) => ({ ...prev, facility_bookings: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });
    const unsubThreads = onSnapshot(query(collection(firestoreDb, 'forum_threads'), where('community_id', '==', currentUser.community_id)), (snapshot) => {
      setDb((prev: any) => ({ ...prev, forum_threads: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });
    const unsubHelp = onSnapshot(query(collection(firestoreDb, 'help_posts'), where('community_id', '==', currentUser.community_id)), (snapshot) => {
      setDb((prev: any) => ({ ...prev, help_posts: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });
    const unsubUsers = onSnapshot(collection(firestoreDb, 'users'), (snapshot) => {
      setDb((prev: any) => ({ ...prev, users: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });
    const unsubPolls = onSnapshot(query(collection(firestoreDb, 'polls'), where('community_id', '==', currentUser.community_id)), (snapshot) => {
      setDb((prev: any) => ({ ...prev, polls: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });
    const unsubVotes = onSnapshot(collection(firestoreDb, 'poll_votes'), (snapshot) => {
      setDb((prev: any) => ({ ...prev, poll_votes: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });
    
    // Phase 2 Listeners
    const unsubIssues = onSnapshot(query(collection(firestoreDb, 'issues'), where('community_id', '==', currentUser.community_id)), (snapshot) => {
      setDb((prev: any) => ({ ...prev, issues: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });
    const unsubEvents = onSnapshot(query(collection(firestoreDb, 'events'), where('community_id', '==', currentUser.community_id)), (snapshot) => {
      setDb((prev: any) => ({ ...prev, events: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });
    const unsubLostFound = onSnapshot(query(collection(firestoreDb, 'lost_found_items'), where('community_id', '==', currentUser.community_id)), (snapshot) => {
      setDb((prev: any) => ({ ...prev, lost_found_items: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });

    return () => { unsubAnnouncements(); unsubBookings(); unsubThreads(); unsubHelp(); unsubUsers(); unsubPolls(); unsubVotes(); unsubIssues(); unsubEvents(); unsubLostFound(); };
  }, [currentUser]);

  const sendNotification = (userId: string, message: string) => {
    setNotifications(prev => [{ id: Date.now(), userId, message, read: false, time: new Date().toLocaleTimeString() }, ...prev]);
  };

  const api = useMemo(() => ({
    logAudit: (action: string, details: any) => {
      setDb((prev: any) => ({ ...prev, auditLogs: [{ id: Date.now(), user_id: currentUser?.id, action, details, timestamp: new Date().toISOString() }, ...prev.auditLogs] }));
    },
    getActiveAlerts: () => db.emergency_alerts.filter((a: any) => a.community_id === currentUser.community_id && a.status === 'Active'),
    
    getAnnouncements: () => db.announcements
      .filter((a: any) => a.community_id === currentUser.community_id)
      .sort((a: any, b: any) => Number(b.isPinned) - Number(a.isPinned) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    createAnnouncement: async (data: any) => {
      const expireDate = new Date();
      expireDate.setFullYear(expireDate.getFullYear() + 10);
      await addDoc(collection(firestoreDb, 'announcements'), {
        ...data, community_id: currentUser.community_id, author_id: currentUser.id, created_at: new Date().toISOString(), expires_at: expireDate.toISOString(), isPinned: false
      });
    },
    deleteAnnouncement: async (announcementId: string) => {
      if (window.confirm("Are you sure you want to delete this announcement?")) {
        await deleteDoc(doc(firestoreDb, 'announcements', announcementId));
      }
    },
    
    // --- Phase 2 API ---
    getIssues: () => db.issues.filter((i: any) => {
      if (i.community_id !== currentUser.community_id) return false;
      if (i.isConfidential && i.author_id !== currentUser.id && currentUser.role !== 'Admin') return false;
      return true;
    }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    createIssue: async (data: any) => {
      await addDoc(collection(firestoreDb, 'issues'), { ...data, community_id: currentUser.community_id, author_id: currentUser.id, status: 'Open', created_at: new Date().toISOString() });
    },
    
    getEvents: () => db.events.filter((e: any) => e.community_id === currentUser.community_id).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    createEvent: async (data: any) => {
      await addDoc(collection(firestoreDb, 'events'), { ...data, community_id: currentUser.community_id, author_id: currentUser.id, created_at: new Date().toISOString() });
    },
    
    getLostFoundItems: () => db.lost_found_items.filter((i: any) => i.community_id === currentUser.community_id).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    createLostFoundItem: async (data: any) => {
      await addDoc(collection(firestoreDb, 'lost_found_items'), { ...data, community_id: currentUser.community_id, author_id: currentUser.id, status: 'Active', created_at: new Date().toISOString() });
    },
    resolveLostFoundItem: async (itemId: string, status: string) => {
      await updateDoc(doc(firestoreDb, 'lost_found_items', itemId), { status });
    },
    // -------------------

    getAnalytics: () => {
      if (currentUser.role !== 'Admin') return null;
      const commIssues = db.issues.filter((i: any) => i.community_id === currentUser.community_id);
      return {
        totalIssues: commIssues.length,
        openIssues: commIssues.filter((i: any) => i.status === 'Open').length,
        activeUsers: db.users.filter((u: any) => u.community_id === currentUser.community_id && u.status === 'approved').length,
        issuesByCategory: commIssues.reduce((acc: any, curr: any) => ({...acc, [curr.category]: (acc[curr.category] || 0) + 1}), {})
      };
    },
    getFacilities: () => db.facilities.filter((f: any) => f.community_id === currentUser.community_id),
    getFacilityBookings: (facilityId: string) => db.facility_bookings.filter((b: any) => b.facility_id === facilityId),
    bookFacility: async (facilityId: string, date: string, slot: string) => {
      const facility = db.facilities.find((f: any) => f.id === facilityId);
      const currentMonth = date.substring(0, 7);
      const userMonthlyBookings = db.facility_bookings.filter((b: any) => b.user_id === currentUser.id && b.date.startsWith(currentMonth) && b.status !== 'Cancelled').length;
      
      if (userMonthlyBookings >= facility.max_monthly_bookings) return alert(`Fair use limit reached. Max ${facility.max_monthly_bookings} bookings per month.`);
      const isDoubleBooked = db.facility_bookings.some((b: any) => b.facility_id === facilityId && b.date === date && b.slot === slot && b.status !== 'Cancelled');
      if (isDoubleBooked) return alert("This slot is already booked.");

      await addDoc(collection(firestoreDb, 'facility_bookings'), { facility_id: facilityId, user_id: currentUser.id, date: date, slot: slot, status: 'Confirmed', created_at: new Date().toISOString() });
      sendNotification(currentUser.id, `Booking confirmed for ${facility.name} on ${date} at ${slot}`);
    },
    getHelpPosts: () => db.help_posts.filter((p: any) => p.community_id === currentUser.community_id).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    updatePrivacy: async (settings: any) => {
      await updateDoc(doc(firestoreDb, 'users', currentUser.id), { privacy: { ...currentUser.privacy, ...settings } });
      setCurrentUser((prev: any) => ({ ...prev, privacy: { ...prev.privacy, ...settings } }));
    },
    downloadData: () => {
      const userData = { profile: currentUser, bookings: db.facility_bookings.filter((b: any) => b.user_id === currentUser.id) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'my_data.json'; a.click();
    },
    getPolls: () => db.polls.filter((p: any) => p.community_id === currentUser.community_id),
    castVote: async (pollId: string, optionId: string) => {
      if (db.poll_votes.some((v: any) => v.poll_id === pollId && v.user_id === currentUser.id)) return;
      await addDoc(collection(firestoreDb, 'poll_votes'), { poll_id: pollId, user_id: currentUser.id, option_id: optionId });
      const poll = db.polls.find((p: any) => p.id === pollId);
      if (poll) {
        const updatedOptions = poll.options.map((o: any) => o.id === optionId ? { ...o, votes: o.votes + 1 } : o );
        await updateDoc(doc(firestoreDb, 'polls', pollId), { options: updatedOptions });
      }
    },
    getThreads: () => db.forum_threads.filter((t: any) => t.community_id === currentUser.community_id).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    createThread: async (data: any) => {
      await addDoc(collection(firestoreDb, 'forum_threads'), { ...data, community_id: currentUser.community_id, author_id: currentUser.id, created_at: new Date().toISOString(), replies: 0 });
    },
    createHelpPost: async (data: any) => {
      await addDoc(collection(firestoreDb, 'help_posts'), { ...data, community_id: currentUser.community_id, author_id: currentUser.id, created_at: new Date().toISOString(), status: 'Open' });
    },
    getMapMarkers: () => db.map_markers.filter((m: any) => m.community_id === currentUser.community_id)
  }), [currentUser, db]);

  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
          <div className="flex justify-center mb-6 text-blue-600 dark:text-blue-400"><Icon name="home" className="w-12 h-12" /></div>
          <h1 className="text-2xl font-bold text-center mb-6">{t('app_title')}</h1>
          {!otpRequested ? (
            <form onSubmit={async (e: any) => { 
              e.preventDefault(); 
              setIsLoading(true);
              try {
                if (!(window as any).recaptchaVerifier) {
                  (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
                }
                const formattedPhone = e.target.phone.value.startsWith('+') ? e.target.phone.value : `+91${e.target.phone.value}`; 
                setConfirmationResult(await signInWithPhoneNumber(auth, formattedPhone, (window as any).recaptchaVerifier));
                setOtpRequested(true);
              } catch (error: any) { alert("Error sending OTP: " + error.message); }
              setIsLoading(false);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('phone_number')}</label>
                <input name="phone" type="tel" defaultValue="+919876543210" className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 outline-none" required />
              </div>
              <div id="recaptcha-container"></div>
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex justify-center">
                {isLoading ? t('loading') : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              setIsLoading(true);
              try {
                const result = await confirmationResult.confirm(e.target.otp.value);
                const userRef = doc(firestoreDb, 'users', result.user.uid);
                const userSnap = await getDoc(userRef);
                let userData;
                if (userSnap.exists()) {
                  userData = userSnap.data();
                } else {
                  userData = { id: result.user.uid, community_id: 'c1', phone: result.user.phoneNumber, name: 'New Resident', building: 'Pending', role: 'Resident', status: 'pending', lang: 'en', privacy: { profileVisibility: 'Verified Only', quietHours: false } };
                  await setDoc(userRef, userData);
                }
                setCurrentUser(userData);
                setLang(userData.lang);
              } catch (error) { alert("Invalid OTP Code."); }
              setIsLoading(false);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Enter OTP</label>
                <input name="otp" type="text" placeholder="123456" className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 outline-none" required />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg flex justify-center">
                {isLoading ? t('loading') : 'Verify & Log In'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const renderAnnouncements = () => {
    const announcements = api.getAnnouncements();
    const polls = api.getPolls();
    return (
      <div className="space-y-8 animate-in fade-in">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{t('announcements')}</h2>
            {(currentUser.role === 'Admin' || currentUser.role === 'Moderator') && (
              <button onClick={() => setShowNewAnnouncement(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
                + {t('new_announcement')}
              </button>
            )}
          </div>
          <div className="space-y-4">
            {announcements.map((ann: any) => {
              const author = db.users.find((u: any) => u.id === ann.author_id);
              const authorName = author?.privacy?.profileVisibility === 'Everyone' ? author?.name : (author?.privacy?.profileVisibility === 'Staff Only' && currentUser.role !== 'Admin') ? 'Anonymous Neighbor' : (author?.name || 'Unknown');
              return (
                <div key={ann.id} className={`p-5 rounded-xl border shadow-sm relative ${ann.isPinned ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                  {ann.isPinned && <Icon name="pin" className="absolute top-4 right-4 text-blue-500 w-5 h-5" />}
                  <h3 className="font-bold text-lg">{ann.title}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500">{ann.category}</span>
                    <span className="text-xs text-slate-500">By {authorName}</span>
                    {(currentUser.role === 'Admin' || currentUser.role === 'Moderator') && (
                      <button onClick={() => api.deleteAnnouncement(ann.id)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded transition ml-auto">🗑️</button>
                    )}
                  </div>
                  <p className="text-sm">{ann.content}</p>
                </div>
              );
            })}
          </div>
        </div>

        {polls.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Icon name="poll_pie" className="w-6 h-6 text-blue-500" /> {t('polls')}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {polls.map((poll: any) => {
                const hasVoted = db.poll_votes.some((v: any) => v.poll_id === poll.id && v.user_id === currentUser.id);
                const totalVotes = poll.options.reduce((sum: number, opt: any) => sum + opt.votes, 0);
                return (
                  <div key={poll.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold mb-4">{poll.title}</h3>
                    <div className="space-y-3">
                      {poll.options.map((opt: any) => {
                        const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                        return (
                          <div key={opt.id} className="relative">
                            <button onClick={() => api.castVote(poll.id, opt.id)} disabled={hasVoted} className={`w-full text-left p-3 rounded-lg border text-sm font-medium z-10 relative ${hasVoted ? 'border-transparent' : 'border-slate-200 hover:border-blue-400'}`}>
                              <div className="flex justify-between relative z-10">
                                <span>{opt.text}</span>{hasVoted && <span className="font-bold">{percent}%</span>}
                              </div>
                            </button>
                            {hasVoted && (
                              <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/40 rounded-lg overflow-hidden border border-blue-200 dark:border-blue-800/50">
                                <div className="h-full bg-blue-200 dark:bg-blue-800/50 transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- Phase 2 Renders ---
  const renderIssues = () => {
    const issues = api.getIssues();
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{t('issues')}</h2>
          <button onClick={() => setShowNewIssue(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">+ {t('report_issue')}</button>
        </div>
        <div className="space-y-4">
          {issues.map((issue: any) => (
            <div key={issue.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{issue.title}</h3>
                <p className="text-xs text-slate-500 mt-1">Category: {issue.category} • Priority: <span className={issue.priority === 'High' ? 'text-red-500 font-bold' : ''}>{issue.priority}</span> {issue.isConfidential && '• 🔒 Confidential'}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-bold rounded ${issue.status === 'Open' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{issue.status}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEvents = () => {
    const events = api.getEvents();
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{t('events')}</h2>
          {(currentUser.role === 'Admin' || currentUser.role === 'Moderator') && (
            <button onClick={() => setShowNewEvent(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">+ New Event</button>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((ev: any) => (
            <div key={ev.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-lg mb-2">{ev.title}</h3>
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1 mb-4">
                <p><Icon name="calendar" className="w-4 h-4 inline mr-1 text-slate-400"/> {new Date(ev.date).toLocaleDateString()}</p>
                <p><Icon name="pin" className="w-4 h-4 inline mr-1 text-slate-400"/> {ev.location}</p>
              </div>
              <button className="w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold rounded-lg text-sm transition">RSVP to Event</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLostFound = () => {
    const items = api.getLostFoundItems();
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{t('lost_found')}</h2>
          <button onClick={() => setShowNewItem(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">+ Report Item</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item: any) => (
            <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${item.type === 'Lost' ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <div className="pl-3">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{item.title}</h3>
                  <span className="text-xs font-bold uppercase bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{item.type}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{item.description}</p>
                <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex justify-between items-center">
                  <span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()}</span>
                  {item.status === 'Active' ? (
                    item.author_id === currentUser.id || currentUser.role === 'Admin' ? (
                      <button onClick={() => api.resolveLostFoundItem(item.id, 'Resolved')} className="text-xs text-blue-600 font-bold hover:underline">Mark Resolved</button>
                    ) : (
                      <button className="text-xs text-blue-600 font-bold hover:underline">Contact Poster</button>
                    )
                  ) : (
                    <span className="text-xs text-green-600 font-bold">✓ Resolved</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  // -------------------------

  const renderForum = () => {
    const threads = api.getThreads();
    return (
      <div className="space-y-6 animate-in fade-in">
         <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t('forum')}</h2>
            <button onClick={() => setShowNewThread(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">+ {t('new_thread')}</button>
         </div>
         <div className="space-y-4">
            {threads.map((thread: any) => {
               const author = db.users.find((u: any) => u.id === thread.author_id);
               const authorName = author?.privacy?.profileVisibility === 'Everyone' ? author?.name : 'Neighbor';
               return (
                 <div key={thread.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-blue-300 transition">
                    <div className="flex justify-between mb-2">
                       <h3 className="font-bold text-lg">{thread.title}</h3>
                       <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">{thread.category}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">{thread.content}</p>
                    <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-100 dark:border-slate-700 pt-3">
                       <div className="flex items-center gap-2"><Icon name="user" className="w-3 h-3" /> {authorName}</div>
                       <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1"><Icon name="message" className="w-3 h-3" /> {thread.replies} Replies</span>
                          <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                       </div>
                    </div>
                 </div>
               );
            })}
         </div>
      </div>
    );
  };

  const renderMap = () => {
    const markers = api.getMapMarkers();
    return (
       <div className="space-y-4 animate-in fade-in h-[calc(100vh-12rem)] min-h-125 flex flex-col">
          <div className="flex justify-between items-center flex-none">
             <h2 className="text-2xl font-bold">{t('map')}</h2>
             <div className="text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">Interactive Map</div>
          </div>
          <div className="relative bg-emerald-50 dark:bg-emerald-900/20 flex-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner">
             <div className="absolute inset-0 opacity-10 dark:opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
             {markers.map((m: any) => (
                <div key={m.id} className="absolute group" style={{ left: `${m.lng}%`, top: `${m.lat}%`, transform: 'translate(-50%, -50%)' }}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer ${m.type === 'safety' ? 'bg-red-500' : 'bg-blue-600'}`}>
                      <Icon name={m.type === 'safety' ? 'alert' : 'map_outline'} className="w-4 h-4" />
                   </div>
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <h4 className="font-bold text-sm mb-1">{m.title}</h4>
                      <p className="text-xs text-slate-500">{m.description}</p>
                   </div>
                </div>
             ))}
             <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-xs">
                <div className="font-bold mb-2">Legend</div>
                <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 bg-blue-600 rounded-full"></div> {t('marker_amenity')}</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div> {t('marker_safety')}</div>
             </div>
          </div>
       </div>
    );
  };

  const renderFacilities = () => {
    const facilities = api.getFacilities();
    const demoDate = '2026-10-15'; 
    return (
      <div className="space-y-6 animate-in fade-in">
         <h2 className="text-2xl font-bold">{t('facilities')}</h2>
         <div className="grid gap-6 md:grid-cols-2">
            {facilities.map((fac: any) => {
               const bookings = api.getFacilityBookings(fac.id).filter((b: any) => b.date === demoDate && b.status !== 'Cancelled');
               const slots = ['10:00', '11:00', '16:00', '17:00'];
               return (
                 <div key={fac.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="font-bold text-xl">{fac.name}</h3>
                       <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1"><Icon name="user" className="w-3 h-3"/> {fac.capacity} Max</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4 bg-slate-50 dark:bg-slate-900 p-2 rounded">{fac.rules}</p>
                    <h4 className="text-sm font-bold mb-2">Slots for {demoDate}</h4>
                    <div className="flex flex-wrap gap-2">
                      {slots.map(slot => {
                         const isBooked = bookings.some((b: any) => b.slot === slot);
                         const isMine = bookings.some((b: any) => b.slot === slot && b.user_id === currentUser.id);
                         return (
                           <button key={slot} onClick={() => !isBooked && api.bookFacility(fac.id, demoDate, slot)} disabled={isBooked}
                             className={`flex-1 min-w-20 py-2 rounded-lg text-sm font-semibold border transition ${isMine ? 'bg-green-100 border-green-200 text-green-700' : isBooked ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'}`}>
                             {slot} {isMine ? '(You)' : isBooked ? '(Full)' : ''}
                           </button>
                         )
                      })}
                    </div>
                 </div>
               )
            })}
         </div>
      </div>
    );
  };

  const renderHelpExchange = () => {
    const posts = api.getHelpPosts();
    return (
      <div className="space-y-6 animate-in fade-in">
         <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t('help_exchange')}</h2>
            <button onClick={() => setShowNewHelp(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">+ {t('offer_help')}</button>
         </div>
         <div className="grid gap-4 md:grid-cols-2">
            {posts.map((post: any) => {
              const author = db.users.find((u: any) => u.id === post.author_id);
              const authorName = author?.privacy?.profileVisibility === 'Everyone' ? author?.name : 'Neighbor';
              return (
                <div key={post.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                   <div className={`absolute top-0 left-0 w-1 h-full ${post.type === 'Request' ? 'bg-orange-500' : post.type === 'Donation Drive' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                   <div className="pl-3">
                     <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-lg">{post.title}</h3>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">{post.type}</span>
                     </div>
                     <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{post.description}</p>
                     {post.type === 'Donation Drive' && post.target && (
                       <div className="mb-4">
                         <div className="flex justify-between text-xs mb-1"><span className="font-medium text-slate-500">{t('progress')}</span><span className="font-bold">{post.current} / {post.target}</span></div>
                         <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                           <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(post.current / post.target) * 100}%` }}></div>
                         </div>
                       </div>
                     )}
                     <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-500 flex items-center gap-1"><Icon name="user" className="w-4 h-4"/> {authorName}</div>
                        <button className="text-sm text-blue-600 font-bold hover:underline flex items-center gap-1"><Icon name="message" className="w-4 h-4"/> Contact</button>
                     </div>
                   </div>
                </div>
              )
            })}
         </div>
      </div>
    );
  };

  const renderAdmin = () => {
    if (currentUser.role !== 'Admin') return <p>Unauthorized</p>;
    const analytics = api.getAnalytics();
    if (!analytics) return null;
    return (
      <div className="space-y-8 animate-in fade-in">
        <h2 className="text-2xl font-bold">{t('admin')} Dashboard</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm">
             <div className="text-sm text-slate-500 font-semibold mb-1">{t('total_issues')}</div>
             <div className="text-3xl font-black text-slate-800 dark:text-slate-100">{analytics.totalIssues}</div>
           </div>
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm">
             <div className="text-sm text-slate-500 font-semibold mb-1">Open Issues</div>
             <div className="text-3xl font-black text-orange-500">{analytics.openIssues}</div>
           </div>
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm">
             <div className="text-sm text-slate-500 font-semibold mb-1">Active Users</div>
             <div className="text-3xl font-black text-blue-500">{analytics.activeUsers}</div>
           </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm">
          <h3 className="font-bold text-lg mb-6">Issues by Category</h3>
          <div className="flex items-end h-40 gap-4" role="img">
            {Object.entries(analytics.issuesByCategory).map(([category, count]: [string, any]) => {
              const maxCount = Math.max(...Object.values(analytics.issuesByCategory as Record<string, number>));
              const height = maxCount === 0 ? 0 : (count / maxCount) * 100;
              return (
                <div key={category} className="flex-1 flex flex-col items-center justify-end group">
                  <div className="text-xs font-bold mb-1 opacity-0 group-hover:opacity-100 transition">{count}</div>
                  <div className="w-full bg-blue-500 rounded-t-sm transition-all" style={{ height: `${height}%` }}></div>
                  <div className="text-[10px] mt-2 text-slate-500 truncate w-full text-center">{category}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    );
  };

  const activeAlerts = api.getActiveAlerts();

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-800'}`}>
      
      {activeAlerts.length > 0 && (
        <div className="fixed top-0 left-0 w-full z-50 bg-red-600 text-white shadow-xl animate-in slide-in-from-top flex flex-col md:flex-row items-center justify-between px-4 py-3 md:px-8">
           <div className="flex items-center gap-3 mb-3 md:mb-0">
             <div className="p-2 bg-white/20 rounded-full animate-pulse"><Icon name="alert" className="w-6 h-6"/></div>
             <div>
               <p className="font-black tracking-widest text-sm opacity-80">{t('emergency_alert')}</p>
               <p className="font-bold text-lg leading-tight">{activeAlerts[0].title}</p>
             </div>
           </div>
        </div>
      )}

      <header className={`sticky top-0 z-30 border-b backdrop-blur-md ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'} ${activeAlerts.length > 0 ? 'mt-22 md:mt-17' : ''}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl">N</div>
            <span className="font-bold text-lg hidden sm:block">Noticeboard</span>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <Icon name="bell" />
                {notifications.filter((n: any) => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                )}
             </button>
             <div className="flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-700">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center cursor-pointer" onClick={() => signOut(auth)}><Icon name="user" className="w-5 h-5" /></div>
             </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row pb-20 md:pb-0 relative">
        <nav className="fixed bottom-0 left-0 w-full md:relative md:w-56 border-t md:border-t-0 md:border-r z-20 flex md:flex-col overflow-x-auto md:overflow-visible md:h-[calc(100vh-4rem)] p-2 md:p-4 gap-2 bg-white dark:bg-slate-950 md:bg-transparent border-slate-200 dark:border-slate-800 hide-scrollbar">
          {[
            { id: 'home', icon: 'home', label: t('announcements') },
            { id: 'issues', icon: 'alert', label: t('issues') },
            { id: 'events', icon: 'calendar', label: t('events') },
            { id: 'lost_found', icon: 'box', label: t('lost_found') },
            { id: 'forum', icon: 'forum_chat', label: t('forum') },
            { id: 'map', icon: 'map_outline', label: t('map') },
            { id: 'facilities', icon: 'key', label: t('facilities') },
            { id: 'help', icon: 'heart', label: t('help_exchange') },
            { id: 'admin', icon: 'chart', label: t('admin'), adminOnly: true },
          ].map(tab => {
            if (tab.adminOnly && currentUser.role !== 'Admin') return null;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 md:p-3 rounded-xl transition-all flex-none min-w-18 md:min-w-0 ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'}`}>
                <Icon name={tab.icon} className={activeTab === tab.id ? "w-6 h-6 md:w-5 md:h-5" : "w-5 h-5"} />
                <span className="text-[10px] md:text-sm whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden min-h-[calc(100vh-4rem)]">
          {activeTab === 'home' && renderAnnouncements()}
          {activeTab === 'issues' && renderIssues()}
          {activeTab === 'events' && renderEvents()}
          {activeTab === 'lost_found' && renderLostFound()}
          {activeTab === 'forum' && renderForum()}
          {activeTab === 'map' && renderMap()}
          {activeTab === 'facilities' && renderFacilities()}
          {activeTab === 'help' && renderHelpExchange()}
          {activeTab === 'admin' && renderAdmin()}
        </main>
      </div>

      {/* --- FORMS & MODALS --- */}
      {showNewAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={async (e: any) => { e.preventDefault(); await api.createAnnouncement({ title: e.target.title.value, content: e.target.content.value, category: e.target.category.value }); setShowNewAnnouncement(false); }} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold">{t('new_announcement')}</h3><button type="button" onClick={() => setShowNewAnnouncement(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             <input name="title" placeholder="Title" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <select name="category" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"><option value="General">General</option><option value="Maintenance">Maintenance</option><option value="Event">Event</option></select>
             <textarea name="content" placeholder="Announcement details..." required rows={4} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"></textarea>
             <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700">Post to Firebase</button>
          </form>
        </div>
      )}

      {/* Phase 2 Forms */}
      {showNewIssue && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={async (e: any) => { e.preventDefault(); await api.createIssue({ title: e.target.title.value, category: e.target.category.value, priority: e.target.priority.value, isConfidential: e.target.isConfidential.checked }); setShowNewIssue(false); }} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold">{t('report_issue')}</h3><button type="button" onClick={() => setShowNewIssue(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             <input name="title" placeholder="What is the issue?" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <select name="category" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent">
               <option value="Plumbing">Plumbing</option><option value="Electrical">Electrical</option><option value="Security">Security</option><option value="Other">Other</option>
             </select>
             <select name="priority" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent">
               <option value="Low">Low Priority</option><option value="Medium">Medium Priority</option><option value="High">High Priority</option>
             </select>
             <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isConfidential" /> Keep this issue confidential (Only Admins can see)</label>
             <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700">Submit Issue</button>
          </form>
        </div>
      )}

      {showNewEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={async (e: any) => { e.preventDefault(); await api.createEvent({ title: e.target.title.value, date: e.target.date.value, location: e.target.location.value }); setShowNewEvent(false); }} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold">Create Event</h3><button type="button" onClick={() => setShowNewEvent(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             <input name="title" placeholder="Event Name" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <input name="date" type="date" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <input name="location" placeholder="Location (e.g., Clubhouse)" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700">Create Event</button>
          </form>
        </div>
      )}

      {showNewItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={async (e: any) => { e.preventDefault(); await api.createLostFoundItem({ title: e.target.title.value, type: e.target.type.value, description: e.target.description.value }); setShowNewItem(false); }} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold">Report Lost/Found Item</h3><button type="button" onClick={() => setShowNewItem(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             <input name="title" placeholder="Item Name (e.g., Blue Umbrella)" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <select name="type" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent">
               <option value="Lost">I Lost This</option><option value="Found">I Found This</option>
             </select>
             <textarea name="description" placeholder="Description & where it was seen..." required rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"></textarea>
             <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700">Post Item</button>
          </form>
        </div>
      )}

      {showNewThread && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={async (e: any) => { e.preventDefault(); await api.createThread({ title: e.target.title.value, content: e.target.content.value, category: e.target.category.value }); setShowNewThread(false); }} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold">{t('new_thread')}</h3><button type="button" onClick={() => setShowNewThread(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             <input name="title" placeholder="Thread Subject" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <select name="category" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent">
               <option value="Neighbors Helping Neighbors">Neighbors Helping</option><option value="Recommendations">Recommendations</option><option value="General Chat">General Chat</option>
             </select>
             <textarea name="content" placeholder="What's on your mind?" required rows={4} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"></textarea>
             <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700">Post Thread</button>
          </form>
        </div>
      )}

      {showNewHelp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={async (e: any) => { e.preventDefault(); await api.createHelpPost({ title: e.target.title.value, description: e.target.description.value, type: e.target.type.value }); setShowNewHelp(false); }} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold">New Request / Offer</h3><button type="button" onClick={() => setShowNewHelp(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             <input name="title" placeholder="E.g., Need a drill for 1 hour" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <select name="type" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent">
               <option value="Request">Request Help</option><option value="Offer">Offer Help</option><option value="Donation Drive">Donation Drive</option>
             </select>
             <textarea name="description" placeholder="Provide some details..." required rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"></textarea>
             <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700">Publish</button>
          </form>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
             <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">{t('privacy_settings')}</h3><button onClick={() => setShowSettings(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2">{t('profile_visibility')}</label>
                  <select value={currentUser.privacy.profileVisibility} onChange={(e: any) => api.updatePrivacy({ profileVisibility: e.target.value })} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent">
                    <option value="Everyone">{t('everyone')}</option><option value="Verified Only">{t('verified_only')}</option><option value="Staff Only">{t('staff_only')}</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                   <div><div className="font-bold text-sm">Quiet Hours</div><div className="text-xs text-slate-500">Mute non-emergency notifications 10PM-7AM</div></div>
                   <input type="checkbox" checked={currentUser.privacy.quietHours} onChange={(e: any) => api.updatePrivacy({ quietHours: e.target.checked })} className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                   <div><div className="font-bold text-sm">Dark Mode</div></div>
                   <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs font-bold">Toggle</button>
                </div>
                <button onClick={api.downloadData} className="w-full py-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold rounded-lg text-sm transition hover:bg-blue-100">{t('download_data')}</button>
             </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}