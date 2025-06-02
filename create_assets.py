#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

def create_assets():
    # Create assets directory if it doesn't exist
    os.makedirs('assets', exist_ok=True)
    
    # Create a simple 1024x1024 icon
    img = Image.new('RGB', (1024, 1024), color='#2563EB')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple 'F' in the center
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Arial.ttf', 400)
    except:
        font = ImageFont.load_default()
    
    # Get text size and center it
    bbox = draw.textbbox((0, 0), 'F', font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (1024 - text_width) // 2
    y = (1024 - text_height) // 2
    
    draw.text((x, y), 'F', fill='white', font=font)
    
    # Save different sizes
    img.save('assets/icon.png')
    img.resize((192, 192)).save('assets/adaptive-icon.png')
    img.resize((1024, 1024)).save('assets/splash.png')
    img.resize((32, 32)).save('assets/favicon.png')
    
    print('Assets created successfully!')

if __name__ == '__main__':
    create_assets() 