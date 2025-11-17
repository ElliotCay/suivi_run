#!/usr/bin/env python3
"""
Calcule le centre de masse visuel pour la navbar (logo 24px + texte "allure")
"""

from PIL import Image, ImageDraw, ImageFont

def analyze_logo(image_path, display_width):
    """Analyse les pixels non-transparents du logo."""
    img = Image.open(image_path).convert('RGBA')
    width, height = img.size
    pixels = img.load()

    # Trouver marges
    left_margin = next((x for x in range(width) if any(pixels[x, y][3] > 10 for y in range(height))), 0)
    right_margin = next((width - 1 - x for x in range(width - 1, -1, -1) if any(pixels[x, y][3] > 10 for y in range(height))), 0)
    
    scale_ratio = display_width / width
    left_margin_display = left_margin * scale_ratio
    right_margin_display = right_margin * scale_ratio
    visual_content_width = (width - left_margin - right_margin) * scale_ratio
    visual_center = left_margin_display + (visual_content_width / 2)
    
    return {
        'left_margin': left_margin_display,
        'right_margin': right_margin_display,
        'visual_center': visual_center,
        'width': display_width
    }

def measure_text_width(text, font_path, font_size):
    """Mesure la largeur du texte."""
    try:
        img = Image.new('RGBA', (500, 100), (255, 255, 255, 0))
        draw = ImageDraw.Draw(img)
        font = ImageFont.truetype(font_path, font_size)
        bbox = draw.textbbox((0, 0), text, font=font)
        return bbox[2] - bbox[0]
    except:
        return font_size * len(text) * 0.55

def calculate_navbar_center():
    logo_path = 'frontend/public/chatgpt-runner-mono.png'
    font_path = 'frontend/app/fonts/Branch.otf'
    
    # Navbar: logo 24px, texte text-base (16px)
    logo_width = 24
    font_size = 16
    overlap = 1  # -ml-1 = 0.25rem = 4px mais à l'échelle 24/112 = ~0.86px, arrondi à 1px
    
    print("=" * 70)
    print("CALCUL NAVBAR - CENTRE DE MASSE VISUEL")
    print("=" * 70)
    
    # Analyser le logo
    logo_info = analyze_logo(logo_path, logo_width)
    print(f"\n1. LOGO (24px)")
    print(f"   Marge gauche: {logo_info['left_margin']:.2f}px")
    print(f"   Marge droite: {logo_info['right_margin']:.2f}px")
    print(f"   Centre visuel: {logo_info['visual_center']:.2f}px")
    
    # Mesurer le texte
    text_width = measure_text_width("allure", font_path, font_size)
    print(f"\n2. TEXTE 'allure' (text-base = 16px)")
    print(f"   Largeur: {text_width:.2f}px")
    
    # Calculer l'ensemble
    total_width = logo_width + text_width - overlap
    print(f"\n3. ENSEMBLE")
    print(f"   Logo: {logo_width}px")
    print(f"   + Texte: {text_width:.2f}px")
    print(f"   - Overlap: {overlap}px")
    print(f"   = Total: {total_width:.2f}px")
    
    # Centre de masse
    text_start = logo_width - overlap
    text_center = text_start + (text_width / 2)
    mass_center = (logo_info['visual_center'] + text_center) / 2
    
    print(f"\n4. CENTRES")
    print(f"   Centre logo: {logo_info['visual_center']:.2f}px")
    print(f"   Centre texte: {text_center:.2f}px")
    print(f"   Centre de masse: {mass_center:.2f}px")
    
    # Décalage pour centrer dans la pill
    # La pill doit centrer le mass_center au milieu de son contenu
    offset = -mass_center + (total_width / 2)
    
    print(f"\n5. DÉCALAGE POUR CENTRAGE")
    print(f"   Offset container: {offset:.2f}px")
    
    print(f"\n" + "=" * 70)
    print(f"RÉSULTAT: Ajouter marginLeft: '{offset:.2f}px' sur le container du logo+texte")
    print(f"=" * 70)
    
    return offset

if __name__ == '__main__':
    calculate_navbar_center()
