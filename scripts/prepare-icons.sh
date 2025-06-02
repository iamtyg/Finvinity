#!/bin/bash

# Icon preparation script for Finvinity
# This script helps prepare all required icon sizes from the new olive branch icon

echo "🎨 Preparing Finvinity icons..."
echo ""

# Check if the new icon exists
if [ ! -f "new-icon.png" ]; then
    echo "❌ Please save your new olive branch icon as 'new-icon.png' in the project root first"
    echo "   Make sure it's 1024x1024 pixels for best quality"
    exit 1
fi

echo "📱 Processing icons..."

# Create assets directory if it doesn't exist
mkdir -p assets

# Copy the main icon (1024x1024)
echo "   📋 Main app icon (1024x1024)"
cp new-icon.png assets/icon.png

# Create adaptive icon (same as main icon for now)
echo "   🤖 Android adaptive icon (1024x1024)"
cp new-icon.png assets/adaptive-icon.png

# Create favicon (256x256) - if you have imagemagick installed
if command -v convert >/dev/null 2>&1; then
    echo "   🌐 Web favicon (256x256)"
    convert new-icon.png -resize 256x256 assets/favicon.png
else
    echo "   🌐 Web favicon (copying 1024x1024 - you may want to resize manually)"
    cp new-icon.png assets/favicon.png
fi

echo ""
echo "✅ Icons prepared successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Test the app to ensure icons display correctly"
echo "   2. Build the app for testing: expo start"
echo "   3. Verify icons on both iOS and Android"
echo ""
echo "📦 Icon files updated:"
echo "   - assets/icon.png (Main app icon)"
echo "   - assets/adaptive-icon.png (Android adaptive)"
echo "   - assets/favicon.png (Web favicon)"
echo "" 