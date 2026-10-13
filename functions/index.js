const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { VertexAI } = require('@google-cloud/vertexai');
const twilio = require('twilio');
admin.initializeApp();

// 1. Digest & SMS Channel Adapter
exports.onEmergencyAlert = functions.firestore
  .document('emergency_alerts/{alertId}')
  .onCreate(async (snap, context) => {
    const alert = snap.data();
    const community = await admin.firestore().doc(`communities/${alert.community_id}`).get();
    
    if (community.data().smsEnabled) {
      const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
      // Fetch users who opted in to SMS for this community
      const users = await admin.firestore().collection('users')
        .where('community_id', '==', alert.community_id)
        .where('channel_consents.sms', '==', true).get();
        
      const messages = users.docs.map(user => 
        client.messages.create({
          body: `[EMERGENCY - ${community.data().name}] ${alert.title}. Reply 1 if safe.`,
          to: user.data().phone,
          from: process.env.TWILIO_PHONE
        })
      );
      await Promise.all(messages);
    }
  });

// 2. AI Community Assistant (Human in the loop)
exports.generateAnnouncementDraft = functions.https.onCall(async (data, context) => {
  const { content, communityId } = data;
  
  // Verify tenant limits
  const community = await admin.firestore().doc(`communities/${communityId}`).get();
  if (!community.data().aiEnabled) throw new functions.https.HttpsError('permission-denied', 'AI disabled for this tenant.');

  // Initialize Google Vertex AI (Gemini)
  const vertex_ai = new VertexAI({project: 'community-noticeboard', location: 'us-central1'});
  const model = vertex_ai.preview.getGenerativeModel({ model: 'gemini-pro'});
  
  const prompt = `Translate the following community announcement into Tamil and Hindi, and provide a 1-sentence summary. Content: ${content}`;
  const resp = await model.generateContent(prompt);
  
  return { generatedData: resp.response.candidates[0].content.parts[0].text };
});

// --- DATABASE MIGRATION SCRIPT ---
exports.runMigration = functions.https.onRequest(async (req, res) => {
  try {
    const db = admin.firestore(); // Initializes the database connection
    const defaultCommunityId = 'c1'; 
    
    // 1. Create Default Community
    await db.collection('communities').doc(defaultCommunityId).set({
      name: 'Legacy Community',
      slug: 'legacy',
      aiEnabled: false,
      smsEnabled: false
    });

    // 2. Update Users (Array-based for multi-tenant support)
    const users = await db.collection('users').get();
    const batch = db.batch();
    users.forEach(user => {
      batch.update(user.ref, { 
        communities: [defaultCommunityId],
        channel_consents: { sms: false, whatsapp: false, email: false }
      });
    });
    
    // 3. Update Existing Records
    const tables = ['announcements', 'issues', 'events'];
    for (const table of tables) {
      const docs = await db.collection(table).get();
      docs.forEach(doc => {
        batch.update(doc.ref, { community_id: defaultCommunityId });
      });
    }
    
    await batch.commit();
    res.status(200).send("✅ Migration to Multi-Tenant successful! You can now close this tab.");
  } catch (error) {
    res.status(500).send("❌ Error: " + error.message);
  }
});