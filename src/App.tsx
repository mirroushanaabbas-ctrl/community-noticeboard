import React, { useState, useEffect, useMemo } from 'react';
import { db as firestoreDb, auth } from './firebase'; 
import { collection, onSnapshot, query, where, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut } from 'firebase/auth';

const TRANSLATIONS: any = {
  en: {
    app_title: 'Noticeboard', login: 'Log In', phone_number: 'Phone Number',
    home: 'Home', issues: 'Issues', events: 'Events', lost_found: 'Lost & Found', 
    forum: 'Forum', map: 'Map', facilities: 'Facilities', help: 'Help', admin: 'Admin',
    visitors: 'Gate & Visitors', documents: 'Documents', directory: 'Directory',
    switch_community: 'Switch Community', ai_assist: '✨ AI Assist', pre_approve: 'Pre-Approve Visitor',
    visitor_name: 'Visitor Name', expected_date: 'Expected Date', generate_pass: 'Generate Gate Pass'
  }
};

const Icon = ({ name, className = "w-5 h-5", onClick }: { name: string, className?: string, onClick?: () => void }) => {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
    settings: <><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
    file: <><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></>,
    chevron_down: <><polyline points="6 9 12 15 18 9"></polyline></>
  };
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} onClick={onClick}>{paths[name] || paths['home']}</svg>;
};

export default function App() {
  const [db, setDb] = useState<any>({ communities: [], users: [], announcements: [], visitor_passes: [], documents: [], directory: [] });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeCommunity, setActiveCommunity] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [lang, setLang] = useState<string>('en');
  const [theme, setTheme] = useState<string>('light');
  
  const [showCommunitySelector, setShowCommunitySelector] = useState(false);
  const [showNewVisitor, setShowNewVisitor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [otpRequested, setOtpRequested] = useState<boolean>(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const t = (key: string): string => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key] || key;
  const isDark = theme === 'dark';

  // 1. REAL AUTHENTICATION LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userSnap = await getDoc(doc(firestoreDb, 'users', firebaseUser.uid));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setCurrentUser(userData);
          setLang(userData.lang || 'en');
          // Automatically select the first community the user belongs to
          if (userData.communities && userData.communities.length > 0) {
            setActiveCommunity(userData.communities[0]);
          }
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. REAL DATABASE SNAPSHOT LISTENERS (Filtered by Multi-Tenant activeCommunity)
  useEffect(() => {
    if (!currentUser || !activeCommunity) return;

    const unsubCommunities = onSnapshot(collection(firestoreDb, 'communities'), (snapshot) => {
      setDb((prev: any) => ({ ...prev, communities: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });

    const unsubAnnouncements = onSnapshot(query(collection(firestoreDb, 'announcements'), where('community_id', '==', activeCommunity)), (snapshot) => {
      setDb((prev: any) => ({ ...prev, announcements: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });

    const unsubVisitors = onSnapshot(query(collection(firestoreDb, 'visitor_passes'), where('community_id', '==', activeCommunity)), (snapshot) => {
      setDb((prev: any) => ({ ...prev, visitor_passes: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });

    const unsubDocs = onSnapshot(query(collection(firestoreDb, 'documents'), where('community_id', '==', activeCommunity)), (snapshot) => {
      setDb((prev: any) => ({ ...prev, documents: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });

    const unsubDir = onSnapshot(query(collection(firestoreDb, 'directory'), where('community_id', '==', activeCommunity)), (snapshot) => {
      setDb((prev: any) => ({ ...prev, directory: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
    });

    return () => { unsubCommunities(); unsubAnnouncements(); unsubVisitors(); unsubDocs(); unsubDir(); };
  }, [currentUser, activeCommunity]);

  // 3. REAL FIREBASE WRITE API
  const api = useMemo(() => ({
    getVisitors: () => db.visitor_passes.filter((v: any) => v.community_id === activeCommunity && (currentUser?.role === 'Security' || currentUser?.role === 'Admin' || v.user_id === currentUser?.id)),
    createVisitorPass: async (data: any) => {
      await addDoc(collection(firestoreDb, 'visitor_passes'), {
        ...data,
        community_id: activeCommunity,
        user_id: currentUser.id,
        status: 'Pending',
        code: Math.floor(1000 + Math.random() * 9000).toString(),
        created_at: new Date().toISOString()
      });
    },
    getDocuments: () => db.documents.filter((d: any) => d.community_id === activeCommunity),
    getDirectory: () => db.directory.filter((d: any) => d.community_id === activeCommunity),
  }), [currentUser, db, activeCommunity]);

  // 4. REAL LOGIN SCREEN
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
                if (!(window as any).recaptchaVerifier) {
                  (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
                }
                const formattedPhone = e.target.phone.value.startsWith('+') ? e.target.phone.value : `+91${e.target.phone.value}`; 
                setConfirmationResult(await signInWithPhoneNumber(auth, formattedPhone, (window as any).recaptchaVerifier));
                setOtpRequested(true);
              } catch (error: any) { alert("Error sending OTP: " + error.message); }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('phone_number')}</label>
                <input name="phone" type="tel" defaultValue="+919876543210" className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 outline-none" required />
              </div>
              <div id="recaptcha-container"></div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex justify-center">Send OTP</button>
            </form>
          ) : (
            <form onSubmit={async (e: any) => {
              e.preventDefault();
              try {
                const result = await confirmationResult.confirm(e.target.otp.value);
                const userRef = doc(firestoreDb, 'users', result.user.uid);
                const userSnap = await getDoc(userRef);
                let userData;
                if (userSnap.exists()) {
                  userData = userSnap.data();
                } else {
                  // Fallback for brand new users
                  userData = { id: result.user.uid, communities: ['c1'], phone: result.user.phoneNumber, name: 'New Resident', role: 'Resident', status: 'approved', lang: 'en' };
                  await setDoc(userRef, userData);
                }
                setCurrentUser(userData);
                setLang(userData.lang || 'en');
                if (userData.communities?.length > 0) setActiveCommunity(userData.communities[0]);
              } catch (error) { alert("Invalid OTP Code."); }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Enter OTP</label>
                <input name="otp" type="text" placeholder="123456" className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 outline-none" required />
              </div>
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg flex justify-center">Verify & Log In</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const communityDetails = db.communities.find((c: any) => c.id === activeCommunity);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* PHASE 5: Multi-Tenant Header */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="relative">
            <button onClick={() => setShowCommunitySelector(!showCommunitySelector)} className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl">{communityDetails?.name?.charAt(0) || 'C'}</div>
              <div className="text-left hidden sm:block">
                <div className="font-bold text-sm leading-tight">{communityDetails?.name || 'Loading Community...'}</div>
                <div className="text-[10px] text-slate-500">{communityDetails?.slug || 'tenant'}.noticeboard.app</div>
              </div>
              <Icon name="chevron_down" className="w-4 h-4 text-slate-400" />
            </button>

            {showCommunitySelector && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-2 z-50">
                <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">{t('switch_community')}</div>
                {db.communities.filter((c: any) => currentUser.communities.includes(c.id)).map((c: any) => (
                  <button key={c.id} onClick={() => { setActiveCommunity(c.id); setShowCommunitySelector(false); }} className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 ${activeCommunity === c.id ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : ''}`}>
                    <div className="w-6 h-6 bg-slate-200 dark:bg-slate-600 rounded flex items-center justify-center font-bold text-xs">{c.name.charAt(0)}</div>
                    {c.name}
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

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row pb-20 md:pb-0 relative">
        <nav className="fixed bottom-0 left-0 w-full md:relative md:w-56 border-t md:border-t-0 md:border-r z-20 flex md:flex-col overflow-x-auto md:overflow-visible md:h-[calc(100vh-4rem)] p-2 md:p-4 gap-2 bg-white dark:bg-slate-950 md:bg-transparent border-slate-200 dark:border-slate-800 hide-scrollbar">
          {[
            { id: 'home', icon: 'home', label: t('home') },
            { id: 'visitors', icon: 'shield', label: t('visitors') },
            { id: 'documents', icon: 'file', label: t('documents') },
            { id: 'directory', icon: 'book', label: t('directory') },
            { id: 'admin', icon: 'settings', label: t('admin'), adminOnly: true },
          ].map(tab => {
            if (tab.adminOnly && !['Admin', 'SuperAdmin'].includes(currentUser.role)) return null;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 md:p-3 rounded-xl transition-all flex-none min-w-18 md:min-w-0 ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'}`}>
                <Icon name={tab.icon} className={activeTab === tab.id ? "w-6 h-6 md:w-5 md:h-5" : "w-5 h-5"} />
                <span className="text-[10px] md:text-sm whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden min-h-[calc(100vh-4rem)]">
          {/* VISITOR MANAGEMENT MODULE */}
          {activeTab === 'visitors' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{t('visitors')}</h2>
                <button onClick={() => setShowNewVisitor(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">+ {t('pre_approve')}</button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {api.getVisitors().map((v: any) => (
                  <div key={v.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{v.visitor_name}</h3>
                      <p className="text-xs text-slate-500 mt-1">Expected: {v.date}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black tracking-widest bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-lg">{v.code}</div>
                      <span className={`text-[10px] uppercase font-bold mt-2 inline-block ${v.status === 'Pending' ? 'text-orange-500' : 'text-green-500'}`}>{v.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOCUMENTS MODULE */}
          {activeTab === 'documents' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-2xl font-bold">{t('documents')}</h2>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
                {api.getDocuments().map((doc: any) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Icon name="file" /></div>
                      <div>
                        <h4 className="font-bold">{doc.title}</h4>
                        <div className="text-xs text-slate-500 flex gap-2"><span>{doc.type}</span>•<span>{doc.size}</span>•<span>Access: {doc.access}</span></div>
                      </div>
                    </div>
                    <button className="text-blue-600 text-sm font-bold hover:underline">Download</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DIRECTORY MODULE */}
          {activeTab === 'directory' && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-2xl font-bold">{t('directory')}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {api.getDirectory().map((dir: any) => (
                  <div key={dir.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">{dir.name} {dir.verified && <span className="text-blue-500 text-sm">✓</span>}</h3>
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">{dir.category}</span>
                      </div>
                    </div>
                    <a href={`tel:${dir.phone}`} className="w-full block text-center py-2 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold rounded-lg text-sm transition hover:bg-green-100">Call {dir.phone}</a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* PHASE 5: AI Assist in Announcement Modal */}
      {showNewVisitor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={(e: any) => { e.preventDefault(); api.createVisitorPass({ visitor_name: e.target.name.value, date: e.target.date.value }); setShowNewVisitor(false); }} className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
             <div className="flex justify-between items-center mb-2"><h3 className="text-xl font-bold">{t('pre_approve')}</h3><button type="button" onClick={() => setShowNewVisitor(false)} className="text-slate-400 text-xl font-bold">&times;</button></div>
             
             {communityDetails?.aiEnabled && (
               <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-3 rounded-lg flex items-start gap-3">
                 <div className="text-indigo-600"><Icon name="bell" /></div>
                 <div className="text-xs text-indigo-800 dark:text-indigo-300">
                   <strong>{t('ai_assist')} Enabled:</strong> Security will automatically scan and verify driver licenses for unmatched records using Vision AI.
                 </div>
               </div>
             )}

             <input name="name" placeholder={t('visitor_name')} required className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent" />
             <input name="date" type="date" required className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent" />
             <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg transition hover:bg-blue-700">{t('generate_pass')}</button>
          </form>
        </div>
      )}
      {/* PHASE 5: Settings & Theme Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Settings</h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 text-xl font-bold">&times;</button>
             </div>
             
             <div className="space-y-6">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                   <div>
                     <div className="font-bold text-sm">Dark Mode</div>
                     <div className="text-xs text-slate-500">Toggle application theme</div>
                   </div>
                   <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs font-bold transition hover:bg-slate-300 dark:hover:bg-slate-600">
                     Toggle
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}