#!/bin/bash

# Deploy Firestore Rules
# This script deploys the updated firestore.rules to your Firebase project

echo "🔥 Deploying Firestore Security Rules..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo ""
    echo "Please install Firebase CLI:"
    echo "  npm install -g firebase-tools"
    echo ""
    echo "Or deploy manually:"
    echo "  1. Go to Firebase Console"
    echo "  2. Navigate to Firestore Database → Rules"
    echo "  3. Copy contents from firestore.rules"
    echo "  4. Paste and click Publish"
    exit 1
fi

# Check if firebase.json exists (project initialized)
if [ ! -f "firebase.json" ]; then
    echo "⚠️  Firebase project not initialized"
    echo ""
    echo "Initializing Firebase..."
    firebase init firestore
    echo ""
fi

# Deploy only Firestore rules
echo "📤 Deploying rules..."
firebase deploy --only firestore:rules

# Check deployment status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Firestore rules deployed successfully!"
    echo ""
    echo "Key changes:"
    echo "  • Admins can now create user profiles for others"
    echo "  • Rule: allow create: if isOwner(userId) || isAdmin()"
    echo ""
    echo "Test the fix:"
    echo "  1. Log in as admin"
    echo "  2. Open User Management"
    echo "  3. Click 'Kullanıcı Ekle'"
    echo "  4. Create a test user"
    echo "  5. Should succeed without 'Profile save failed' error"
    echo ""
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "Manual deployment:"
    echo "  1. Go to: https://console.firebase.google.com/"
    echo "  2. Select your project"
    echo "  3. Firestore Database → Rules"
    echo "  4. Copy from: firestore.rules"
    echo "  5. Paste and Publish"
    exit 1
fi
