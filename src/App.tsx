import React, { useState, useEffect, useMemo } from 'react';
import { db as firestoreDb, auth } from './firebase'; 
import { collection, onSnapshot, query, where, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'; 
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut } from 'firebase/auth';

const TRANSLATIONS: any = {
  en: {
    app_title: 'Noticeboard', login: 'Log In', phone_number: 'Phone Number',
    home: 'Home', announcements: 'Announcements', issues: 'Issues', events: 'Events', 
    lost_found: 'Lost & Found', forum: 'Forum', map: 'Map', facilities: 'Facilities', 
    help_exchange: 'Help', admin: 'Admin', visitors: 'Gate & Visitors', documents: 'Documents', 
    directory: 'Directory', switch_community: 'Switch Community', ai_assist: '✨ AI Assist', 
    pre_approve: 'Pre-Approve Visitor', new_announcement: 'New Announcement', 
    report_issue: 'Report Issue', offer_help: 'Offer Help', new_thread: 'New Thread',
    privacy_settings: 'Settings'
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
    pin: <><path d="M21.1 16.3l-8.5-8.5a1.5 1.5 0 0 0-2.1 2.1l2.6 2.6L4.7 20.9a1 1 0 0 0 1.4 1.4l8.4-8.4 2.6 2.6a1.5 1.5 0 0 0 2.1-2.1l-1.9-1.9 3.8-3.8a1 1 0 0 0-1.4-1.4z"/></>,
    box: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></>,
    message: <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></>,
    chart: <><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></>,
    map_outline: <><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></>,
    forum_chat: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></>,
    poll_pie: <><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></>,
    settings: <><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></>,
    key: <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></>,
    heart: <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></>,
    file: <><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></>,
    chevron_down: <><polyline points="6 9 12 15 18 9"></polyline></>
  };
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} onClick={onClick}>{paths[name] || paths['alert']}</svg>;
};

export default function App() {
  const [db, setDb] = useState<any>({ 
    communities: [], users: [], announcements: [], issues: [], events: [], lost_found_items: [], 
    polls: [], poll_votes: [], forum_threads: [], facilities: [], facility_bookings: [], 
    help_posts: [], map_markers: [], visitor_passes: [], documents: [], directory: [] 
  });
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeCommunity, setActiveCommunity] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [lang, setLang] = useState<string>('en');
  const [theme, setTheme] = useState<string>('light');
  
  // UI & Modal States
  const [showCommunitySelector, setShowCommunitySelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showNewItem, setShowNewItem] = useState(false);
  const [showNewThread, setShowNewThread] = useState(false);
  const [showNewHelp, setShowNewHelp] = useState(false);
  const [showNewVisitor, setShowNewVisitor] = useState(false);
  
  const [otpRequested, setOtpRequested] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const t = (key: string): string => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key] || key;
  const isDark = theme === 'dark';

  useEffect(() => { document.documentElement.className = theme; }, [theme]);

  // 1. AUTHENTICATION
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userSnap = await getDoc(doc(firestoreDb, 'users', firebaseUser.uid));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setCurrentUser(userData);
          setLang(userData.lang || 'en');
          if (userData.communities && userData.communities.length > 0) setActiveCommunity(userData.communities[0]);
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. MULTI-TENANT DATA LISTENERS
  useEffect(() => {
    if (!currentUser || !activeCommunity) return;

    const listeners = [
      onSnapshot(collection(firestoreDb, 'communities'), s => setDb((p: any) => ({ ...p, communities: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
      onSnapshot(collection(firestoreDb, 'users'), s => setDb((p: any) => ({ ...p, users: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
      onSnapshot(collection(firestoreDb, 'poll_votes'), s => setDb((p: any) => ({ ...p, poll_votes: s.docs.map(d => ({ id: d.id, ...d.data() })) }))),
      onSnapshot(collection(firestoreDb, 'facility_bookings'), s => setDb((p: any) => ({ ...p, facility_bookings: s.docs.map(d => ({ id: d.id, ...d.data() })) })))
    ];

    const collections = ['announcements', 'issues', 'events', 'lost_found_items', 'polls', 'forum_threads', 'facilities', 'help_posts', 'map_markers', 'visitor_passes', 'documents', 'directory'];
    
    collections.forEach(col => {
      listeners.push(onSnapshot(query(collection(firestoreDb, col), where('community_id', '==', activeCommunity)), s => {
        setDb((p: any) => ({ ...p, [col]: s.docs.map(d => ({ id: d.id, ...d.data() })) }));
      }));
    });

    return () => listeners.forEach(unsub => unsub());
  }, [currentUser, activeCommunity]);

  // 3. API WRITE METHODS
  const api = useMemo(() => ({
    getAnnouncements: () => db.announcements.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    createAnnouncement: async (data: any) => addDoc(collection(firestoreDb, 'announcements'), { ...data, community_id: activeCommunity, author_id: currentUser.id, created_at: new Date().toISOString() }),
    deleteAnnouncement: async (id: string) => { if (window.confirm("Delete?")) await deleteDoc(doc(firestoreDb, 'announcements', id)); },
    
    getIssues: () => db.issues.filter((i: any) => !i.isConfidential || i.author_id === currentUser.id || currentUser.role === 'Admin').sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    createIssue: async (data: any) => addDoc(collection(firestoreDb, 'issues'), { ...data, community_id: activeCommunity, author_id: currentUser.id, status: 'Open', created_at: new Date().toISOString() }),
    
    getEvents: () => db.events.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    createEvent: async (data: any) => addDoc(collection(firestoreDb, 'events'), { ...data, community_id: activeCommunity, author_id: currentUser.id, created_at: new Date().toISOString() }),
    
    getLostFoundItems: () => db.lost_found_items.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    createLostFoundItem: async (data: any) => addDoc(collection(firestoreDb, 'lost_found_items'), { ...data, community_id: activeCommunity, author_id: currentUser.id, status: 'Active', created_at: new Date().toISOString() }),
    resolveLostFoundItem: async (id: string) => updateDoc(doc(firestoreDb, 'lost_found_items', id), { status: 'Resolved' }),

    getThreads: () => db.forum_threads.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    createThread: async (data: any) => addDoc(collection(firestoreDb, 'forum_threads'), { ...data, community_id: activeCommunity, author_id: currentUser.id, created_at: new Date().toISOString(), replies: 0 }),
    
    getHelpPosts: () => db.help_posts.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    createHelpPost: async (data: any) => addDoc(collection(firestoreDb, 'help_posts'), { ...data, community_id: activeCommunity, author_id: currentUser.id, created_at: new Date().toISOString(), status: 'Open' }),

    getPolls: () => db.polls,
    castVote: async (pollId: string, optionId: string) => {
      if (db.poll_votes.some((v: any) => v.poll_id === pollId && v.user_id === currentUser.id)) return;
      await addDoc(collection(firestoreDb, 'poll_votes'), { poll_id: pollId, user_id: currentUser.id, option_id: optionId });
      const poll = db.polls.find((p: any) => p.id === pollId);
      if (poll) await updateDoc(doc(firestoreDb, 'polls', pollId), { options: poll.options.map((o: any) => o.id === optionId ? { ...o, votes: o.votes + 1 } : o ) });
    },

    getFacilities: () => db.facilities,
    getFacilityBookings: (id: string) => db.facility_bookings.filter((b: any) => b.facility_id === id),
    bookFacility: async (facilityId: string, date: string, slot: string) => {
      const isDoubleBooked = db.facility_bookings.some((b: any) => b.facility_id === facilityId && b.date === date && b.slot === slot && b.status !== 'Cancelled');
      if (isDoubleBooked) return alert("Slot already booked.");
      await addDoc(collection(firestoreDb, 'facility_bookings'), { facility_id: facilityId, user_id: currentUser.id, date, slot, status: 'Confirmed' });
    },

    getMapMarkers: () => db.map_markers,
    getVisitors: () => db.visitor_passes.filter((v: any) => currentUser?.role === 'Security' || currentUser?.role === 'Admin' || v.user_id === currentUser?.id),
    createVisitorPass: async (data: any) => addDoc(collection(firestoreDb, 'visitor_passes'), { ...data, community_id: activeCommunity, user_id: currentUser.id, status: 'Pending', code: Math.floor(1000 + Math.random() * 9000).toString() }),
    getDocuments: () => db.documents,
    getDirectory: () => db.directory,

    getAnalytics: () => {
      if (currentUser.role !== 'Admin') return null;
      return {
        totalIssues: db.issues.length,
        openIssues: db.issues.filter((i: any) => i.status === 'Open').length,
        activeUsers: db.users.filter((u: any) => u.communities?.includes(activeCommunity)).length,
      };
    }
  }), [currentUser, db, activeCommunity]);

  // LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
          <div className="flex justify-center mb-6 text-blue-600 dark:text-blue-400"><Icon name="home" className="w-12 h-12" /></div>
          <h1 className="text-2xl font-bold text-center mb-6">{t('app_title')}</h1>
          {!otpRequested ? (
            <form onSubmit={async (e: any) => { 
              e.preventDefault(); 
              try {
                if (!(window as any).recaptchaVerifier) (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
                setConfirmationResult(await signInWithPhoneNumber(auth, e.target.phone.value.startsWith('+') ? e.target.phone.value : `+91${e.target.phone.value}`, (window as any).recaptchaVerifier));
                setOtpRequested(true);
              } catch (error: any) { alert("Error: " + error.message); }
            }} className="space-y-4">
              <label className="block text-sm font-medium mb-1">{t('phone_number')}</label>
              <input name="phone" type="tel" defaultValue="+919876543210" className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 outline-none" required />
              <div id="recaptcha-container"></div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg">Send OTP</button>
            </form>
          ) : (
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              try {
                const result = await confirmationResult.confirm(e.target.otp.value);
                const userRef = doc(firestoreDb, 'users', result.user.uid);
                const userSnap = await getDoc(userRef);
                let userData = userSnap.exists() ? userSnap.data() : { id: result.user.uid, communities: ['c1'], phone: result.user.phoneNumber, name: 'Resident', role: 'Resident', lang: 'en' };
                if (!userSnap.exists()) await setDoc(userRef, userData);
                setCurrentUser(userData);
                setLang(userData.lang || 'en');
                if (userData.communities?.length > 0) setActiveCommunity(userData.communities[0]);
              } catch (error) { alert("Invalid OTP Code."); }
            }} className="space-y-4">
              <label className="block text-sm font-medium mb-1">Enter OTP</label>
              <input name="otp" type="text" placeholder="123456" className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 outline-none" required />
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg">Verify & Log In</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const communityDetails = db.communities.find((c: any) => c.id === activeCommunity);

  // RENDER BLOCKS
  const renderAnnouncements = () => (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('announcements')}</h2>
        {['Admin', 'Moderator'].includes(currentUser.role) && <button onClick={() => setShowNewAnnouncement(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">+ {t('new_announcement')}</button>}
      </div>
      <div className="space-y-4">
        {api.getAnnouncements().map((ann: any) => (
          <div key={ann.id} className="p-5 rounded-xl border shadow-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 relative">
            {ann.isPinned && <Icon name="pin" className="absolute top-4 right-4 text-blue-500 w-5 h-5" />}
            <h3 className="font-bold text-lg">{ann.title}</h3>
            <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
              <span className="font-medium bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{ann.category}</span>
              {['Admin', 'Moderator'].includes(currentUser.role) && <button onClick={() => api.deleteAnnouncement(ann.id)} className="text-red-500 hover:text-red-700 ml-auto">Delete</button>}
            </div>
            <p className="text-sm">{ann.content}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderIssues = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">{t('issues')}</h2><button onClick={() => setShowNewIssue(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold">+ {t('report_issue')}</button></div>
      <div className="space-y-4">
        {api.getIssues().map((issue: any) => (
          <div key={issue.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border shadow-sm flex justify-between items-start">
            <div><h3 className="font-bold text-lg">{issue.title}</h3><p className="text-xs text-slate-500 mt-1">{issue.category} • {issue.priority} {issue.isConfidential && '• 🔒'}</p></div>
            <span className={`px-2 py-1 text-xs font-bold rounded ${issue.status === 'Open' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{issue.status}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLostFound = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">{t('lost_found')}</h2><button onClick={() => setShowNewItem(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">+ Report Item</button></div>
      <div className="grid gap-4 md:grid-cols-2">
        {api.getLostFoundItems().map((item: any) => (
          <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${item.type === 'Lost' ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <div className="pl-3">
              <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-lg">{item.title}</h3><span className="text-xs font-bold uppercase">{item.type}</span></div>
              <p className="text-sm text-slate-600 mb-3">{item.description}</p>
              {item.status === 'Active' && item.author_id === currentUser.id ? <button onClick={() => api.resolveLostFoundItem(item.id)} className="text-xs text-blue-600 font-bold hover:underline">Mark Resolved</button> : <span className="text-xs text-slate-500">{item.status}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderForum = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">{t('forum')}</h2><button onClick={() => setShowNewThread(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">+ {t('new_thread')}</button></div>
      <div className="space-y-4">
        {api.getThreads().map((thread: any) => (
          <div key={thread.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border shadow-sm">
            <div className="flex justify-between mb-2"><h3 className="font-bold text-lg">{thread.title}</h3><span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{thread.category}</span></div>
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">{thread.content}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMap = () => (
    <div className="space-y-4 animate-in fade-in h-[calc(100vh-12rem)] flex flex-col">
       <h2 className="text-2xl font-bold">{t('map')}</h2>
       <div className="relative bg-emerald-50 dark:bg-emerald-900/20 flex-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          {api.getMapMarkers().map((m: any) => (
             <div key={m.id} className="absolute group" style={{ left: `${m.lng}%`, top: `${m.lat}%`, transform: 'translate(-50%, -50%)' }}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer ${m.type === 'safety' ? 'bg-red-500' : 'bg-blue-600'}`}><Icon name={m.type === 'safety' ? 'alert' : 'map_outline'} className="w-4 h-4" /></div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white border p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10">
                   <h4 className="font-bold text-sm mb-1 text-black">{m.title}</h4>
                   <p className="text-xs text-slate-500">{m.description}</p>
                </div>
             </div>
          ))}
       </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* HEADER */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="relative">
            <button onClick={() => setShowCommunitySelector(!showCommunitySelector)} className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl">{communityDetails?.name?.charAt(0) || 'C'}</div>
              <div className="text-left hidden sm:block">
                <div className="font-bold text-sm leading-tight">{communityDetails?.name || 'Loading...'}</div>
                <div className="text-[10px] text-slate-500">{communityDetails?.slug || 'tenant'}.noticeboard.app</div>
              </div>
              <Icon name="chevron_down" className="w-4 h-4 text-slate-400" />
            </button>
            {showCommunitySelector && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-2 z-50">
                <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('switch_community')}</div>
                {db.communities.filter((c: any) => currentUser.communities.includes(c.id)).map((c: any) => (
                  <button key={c.id} onClick={() => { setActiveCommunity(c.id); setShowCommunitySelector(false); }} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 ${activeCommunity === c.id ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : ''}`}>
                    <div className="w-6 h-6 bg-slate-200 dark:bg-slate-600 rounded flex items-center justify-center font-bold text-xs">{c.name.charAt(0)}</div>{c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
             <button className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"><Icon name="bell" /></button>
             <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"><Icon name="settings" /></button>
             <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center cursor-pointer ml-2" onClick={() => signOut(auth)}><Icon name="user" className="w-5 h-5" /></div>
          </div>
        </div>
      </header>

      {/* APP SHELL */}
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
            { id: 'visitors', icon: 'shield', label: t('visitors') },
            { id: 'documents', icon: 'file', label: t('documents') },
            { id: 'directory', icon: 'book', label: t('directory') },
            { id: 'admin', icon: 'chart', label: t('admin'), adminOnly: true },
          ].map(tab => {
            if (tab.adminOnly && !['Admin', 'SuperAdmin'].includes(currentUser.role)) return null;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 md:p-3 rounded-xl transition-all flex-none min-w-18 md:min-w-0 ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'}`}>
                <Icon name={tab.icon} className={activeTab === tab.id ? "w-6 h-6 md:w-5 md:h-5" : "w-5 h-5"} /><span className="text-[10px] md:text-sm whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden min-h-[calc(100vh-4rem)]">
          {activeTab === 'home' && renderAnnouncements()}
          {activeTab === 'issues' && renderIssues()}
          {activeTab === 'lost_found' && renderLostFound()}
          {activeTab === 'forum' && renderForum()}
          {activeTab === 'map' && renderMap()}

          {/* EVENTS */}
          {activeTab === 'events' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">{t('events')}</h2><button onClick={() => setShowNewEvent(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">+ New Event</button></div>
              <div className="grid gap-4 md:grid-cols-2">
                {api.getEvents().map((ev: any) => (
                  <div key={ev.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border shadow-sm">
                    <h3 className="font-bold text-lg mb-2">{ev.title}</h3>
                    <p className="text-sm text-slate-600 mb-4">{new Date(ev.date).toLocaleDateString()} • {ev.location}</p>
                    <button className="w-full py-2 bg-slate-100 dark:bg-slate-700 font-bold rounded-lg text-sm">RSVP</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FACILITIES */}
          {activeTab === 'facilities' && (
            <div className="space-y-6 animate-in fade-in">
               <h2 className="text-2xl font-bold">{t('facilities')}</h2>
               <div className="grid gap-6 md:grid-cols-2">
                  {api.getFacilities().map((fac: any) => (
                     <div key={fac.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm">
                        <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-xl">{fac.name}</h3><span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{fac.capacity} Max</span></div>
                        <p className="text-xs text-slate-500 mb-4 bg-slate-50 dark:bg-slate-900 p-2 rounded">{fac.rules}</p>
                     </div>
                  ))}
               </div>
            </div>
          )}

          {/* HELP EXCHANGE */}
          {activeTab === 'help' && (
            <div className="space-y-6 animate-in fade-in">
               <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">{t('help_exchange')}</h2><button onClick={() => setShowNewHelp(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">+ {t('offer_help')}</button></div>
               <div className="grid gap-4 md:grid-cols-2">
                  {api.getHelpPosts().map((post: any) => (
                    <div key={post.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border shadow-sm relative overflow-hidden">
                       <div className={`absolute top-0 left-0 w-1 h-full ${post.type === 'Request' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                       <div className="pl-3"><h3 className="font-bold text-lg mb-1">{post.title}</h3><p className="text-sm text-slate-600">{post.description}</p></div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* VISITORS */}
          {activeTab === 'visitors' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">{t('visitors')}</h2><button onClick={() => setShowNewVisitor(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">+ {t('pre_approve')}</button></div>
              <div className="grid gap-4 md:grid-cols-2">
                {api.getVisitors().map((v: any) => (
                  <div key={v.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border shadow-sm flex justify-between"><div className="font-bold">{v.visitor_name}</div><div className="font-black tracking-widest">{v.code}</div></div>
                ))}
              </div>
            </div>
          )}

          {/* DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-2xl font-bold">{t('directory')}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {api.getDirectory().map((dir: any) => (
                  <div key={dir.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border shadow-sm">
                    <h3 className="font-bold text-lg">{dir.name}</h3><span className="text-xs text-slate-500">{dir.category}</span>
                    <a href={`tel:${dir.phone}`} className="mt-4 block text-center py-2 bg-green-50 text-green-700 font-bold rounded-lg text-sm">Call {dir.phone}</a>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* DOCUMENTS */}
          {activeTab === 'documents' && (
             <div className="space-y-6 animate-in fade-in"><h2 className="text-2xl font-bold">{t('documents')}</h2><div className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm divide-y">
                {api.getDocuments().map((doc: any) => (<div key={doc.id} className="p-4 flex justify-between"><h4 className="font-bold">{doc.title}</h4><button className="text-blue-600 font-bold text-sm">Download</button></div>))}
             </div></div>
          )}
          
          {/* ADMIN */}
          {activeTab === 'admin' && (
            <div className="space-y-6 animate-in fade-in"><h2 className="text-2xl font-bold">Admin Dashboard</h2><div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border"><div className="text-sm text-slate-500 font-semibold mb-1">Total Issues</div><div className="text-3xl font-black">{api.getAnalytics()?.totalIssues}</div></div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border"><div className="text-sm text-slate-500 font-semibold mb-1">Active Users</div><div className="text-3xl font-black">{api.getAnalytics()?.activeUsers}</div></div>
            </div></div>
          )}
        </main>
      </div>

      {/* --- MODALS --- */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
             <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">{t('privacy_settings')}</h3><button onClick={() => setShowSettings(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"><div><div className="font-bold text-sm">Dark Mode</div></div><button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs font-bold">Toggle</button></div>
          </div>
        </div>
      )}

      {showNewAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={(e: any) => { e.preventDefault(); api.createAnnouncement({ title: e.target.title.value, content: e.target.content.value, category: e.target.category.value }); setShowNewAnnouncement(false); }} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold">{t('new_announcement')}</h3><button type="button" onClick={() => setShowNewAnnouncement(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             <input name="title" placeholder="Title" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <select name="category" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"><option value="General">General</option><option value="Maintenance">Maintenance</option></select>
             <textarea name="content" placeholder="Details..." required rows={4} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"></textarea>
             <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-sm">Post</button>
          </form>
        </div>
      )}

      {showNewIssue && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={(e: any) => { e.preventDefault(); api.createIssue({ title: e.target.title.value, category: e.target.category.value, priority: e.target.priority.value }); setShowNewIssue(false); }} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold">{t('report_issue')}</h3><button type="button" onClick={() => setShowNewIssue(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             <input name="title" placeholder="Issue..." required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <select name="category" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"><option value="Plumbing">Plumbing</option><option value="Electrical">Electrical</option></select>
             <select name="priority" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"><option value="Low">Low</option><option value="High">High</option></select>
             <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-sm">Submit</button>
          </form>
        </div>
      )}

      {showNewVisitor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={(e: any) => { e.preventDefault(); api.createVisitorPass({ visitor_name: e.target.name.value, date: e.target.date.value }); setShowNewVisitor(false); }} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold">{t('pre_approve')}</h3><button type="button" onClick={() => setShowNewVisitor(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             {communityDetails?.aiEnabled && <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg text-xs text-indigo-800"><strong>{t('ai_assist')} Enabled</strong></div>}
             <input name="name" placeholder="Visitor Name" required className="w-full p-3 border border-slate-300 rounded-lg bg-transparent" />
             <input name="date" type="date" required className="w-full p-3 border border-slate-300 rounded-lg bg-transparent" />
             <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg">Generate Gate Pass</button>
          </form>
        </div>
      )}
      {showNewEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={(e: any) => { e.preventDefault(); api.createEvent({ title: e.target.title.value, date: e.target.date.value, location: e.target.location.value }); setShowNewEvent(false); }} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold">New Event</h3><button type="button" onClick={() => setShowNewEvent(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             <input name="title" placeholder="Event Name" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <input name="date" type="date" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <input name="location" placeholder="Location" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-sm">Create Event</button>
          </form>
        </div>
      )}

      {showNewItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={(e: any) => { e.preventDefault(); api.createLostFoundItem({ title: e.target.title.value, type: e.target.type.value, description: e.target.description.value }); setShowNewItem(false); }} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold">Report Item</h3><button type="button" onClick={() => setShowNewItem(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             <input name="title" placeholder="Item Name" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <select name="type" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"><option value="Lost">Lost</option><option value="Found">Found</option></select>
             <textarea name="description" placeholder="Description..." required rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"></textarea>
             <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-sm">Submit</button>
          </form>
        </div>
      )}

      {showNewThread && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={(e: any) => { e.preventDefault(); api.createThread({ title: e.target.title.value, category: e.target.category.value, content: e.target.content.value }); setShowNewThread(false); }} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold">New Thread</h3><button type="button" onClick={() => setShowNewThread(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             <input name="title" placeholder="Thread Subject" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <select name="category" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"><option value="General">General</option><option value="Recommendations">Recommendations</option></select>
             <textarea name="content" placeholder="What's on your mind?" required rows={4} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"></textarea>
             <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-sm">Post</button>
          </form>
        </div>
      )}

      {showNewHelp && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={(e: any) => { e.preventDefault(); api.createHelpPost({ title: e.target.title.value, type: e.target.type.value, description: e.target.description.value }); setShowNewHelp(false); }} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold">Help Exchange</h3><button type="button" onClick={() => setShowNewHelp(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             <input name="title" placeholder="Request or Offer" required className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent" />
             <select name="type" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"><option value="Request">Request</option><option value="Offer">Offer</option></select>
             <textarea name="description" placeholder="Details..." required rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"></textarea>
             <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-sm">Publish</button>
          </form>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: ` .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}} />
    </div>
  );
}