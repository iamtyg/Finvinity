#!/usr/bin/env python3
import os

def create_placeholder_assets():
    """Create placeholder asset files with proper dimensions"""
    
    # SVG content for splash screen (1024x1024)
    splash_svg = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#ffffff"/>
  <circle cx="512" cy="350" r="120" fill="#3B82F6"/>
  <rect x="412" y="470" width="200" height="20" rx="10" fill="#3B82F6"/>
  <rect x="462" y="510" width="100" height="15" rx="7" fill="#6B7280"/>
  <text x="512" y="600" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#1F2937">Finvinity</text>
  <text x="512" y="650" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#6B7280">Portfolio Tracker</text>
</svg>'''

    # SVG content for adaptive icon (foreground - 1024x1024)
    adaptive_icon_svg = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="none"/>
  <circle cx="512" cy="400" r="140" fill="#3B82F6"/>
  <rect x="392" y="540" width="240" height="25" rx="12" fill="#3B82F6"/>
  <rect x="442" y="585" width="140" height="18" rx="9" fill="#1F2937"/>
  <text x="512" y="720" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="#1F2937">F</text>
</svg>'''

    # SVG content for favicon (512x512)
    favicon_svg = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#3B82F6"/>
  <circle cx="256" cy="200" r="70" fill="#ffffff"/>
  <rect x="206" y="270" width="100" height="12" rx="6" fill="#ffffff"/>
  <rect x="231" y="295" width="50" height="9" rx="4" fill="#E5E7EB"/>
  <text x="256" y="380" text-anchor="middle" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="#ffffff">F</text>
</svg>'''

    try:
        # Write splash screen
        with open('assets/splash.svg', 'w') as f:
            f.write(splash_svg)
        print("✅ Created splash.svg")

        # Write adaptive icon
        with open('assets/adaptive-icon.svg', 'w') as f:
            f.write(adaptive_icon_svg)
        print("✅ Created adaptive-icon.svg")

        # Write favicon
        with open('assets/favicon.svg', 'w') as f:
            f.write(favicon_svg)
        print("✅ Created favicon.svg")

        print("\n🎉 Asset generation complete!")
        print("📝 Note: You may need to convert SVG files to PNG format for production use.")
        print("   You can use online converters or tools like ImageMagick:")
        print("   - splash.png (1024x1024)")
        print("   - adaptive-icon.png (1024x1024)")
        print("   - favicon.png (512x512)")

    except Exception as e:
        print(f"❌ Error creating assets: {e}")

if __name__ == "__main__":
    create_placeholder_assets() 