#!/usr/bin/env python3
"""
Calcule le centre de masse visuel exact de logo + texte "allure"
pour un alignement parfait à 10/10.
"""

from PIL import Image, ImageDraw, ImageFont
import sys

def analyze_logo(image_path):
    """Analyse les pixels non-transparents du logo."""
    img = Image.open(image_path)
    img = img.convert('RGBA')

    width, height = img.size
    pixels = img.load()

    # Trouver le premier pixel non-transparent à gauche
    left_margin = 0
    for x in range(width):
        has_content = False
        for y in range(height):
            r, g, b, a = pixels[x, y]
            if a > 10:
                has_content = True
                break
        if has_content:
            left_margin = x
            break

    # Trouver le dernier pixel non-transparent à droite
    right_margin = 0
    for x in range(width - 1, -1, -1):
        has_content = False
        for y in range(height):
            r, g, b, a = pixels[x, y]
            if a > 10:
                has_content = True
                break
        if has_content:
            right_margin = width - 1 - x
            break

    # Contenu visuel du logo
    visual_content_width = width - left_margin - right_margin
    visual_center_from_left = left_margin + (visual_content_width / 2)

    return {
        'width': width,
        'left_margin': left_margin,
        'right_margin': right_margin,
        'visual_content_width': visual_content_width,
        'visual_center_from_left': visual_center_from_left
    }

def measure_text_width(text, font_path, font_size):
    """Mesure la largeur du texte avec la police Branch."""
    try:
        # Créer une image temporaire pour mesurer le texte
        img = Image.new('RGBA', (2000, 500), (255, 255, 255, 0))
        draw = ImageDraw.Draw(img)

        # Charger la police Branch
        font = ImageFont.truetype(font_path, font_size)

        # Mesurer le texte
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]

        return text_width
    except Exception as e:
        print(f"Erreur lors de la mesure du texte: {e}")
        # Estimation approximative si la police n'est pas accessible
        return font_size * len(text) * 0.6

def calculate_visual_center(logo_path, font_path, display_logo_width=112, overlap_px=4):
    """
    Calcule le décalage nécessaire pour centrer visuellement logo + texte.

    Args:
        logo_path: Chemin vers le logo PNG
        font_path: Chemin vers la police Branch
        display_logo_width: Largeur d'affichage du logo (112px)
        overlap_px: Overlap du texte sur le logo (4px de la charte)
    """

    print("=" * 70)
    print("CALCUL DU CENTRE DE MASSE VISUEL - MÉTHODE SCIENTIFIQUE")
    print("=" * 70)

    # 1. Analyser le logo
    logo_info = analyze_logo(logo_path)
    original_width = logo_info['width']
    scale_ratio = display_logo_width / original_width

    print(f"\n1. ANALYSE DU LOGO")
    print(f"   Dimensions originales: {original_width}px")
    print(f"   Dimensions affichées: {display_logo_width}px")
    print(f"   Ratio de mise à l'échelle: {scale_ratio:.6f}")
    print(f"   Marge gauche (original): {logo_info['left_margin']}px")
    print(f"   Marge droite (original): {logo_info['right_margin']}px")

    # Marges à l'échelle affichée
    left_margin_display = logo_info['left_margin'] * scale_ratio
    right_margin_display = logo_info['right_margin'] * scale_ratio
    visual_content_width_display = logo_info['visual_content_width'] * scale_ratio

    print(f"   Marge gauche (affichée): {left_margin_display:.2f}px")
    print(f"   Marge droite (affichée): {right_margin_display:.2f}px")
    print(f"   Largeur contenu visuel: {visual_content_width_display:.2f}px")

    # 2. Mesurer le texte "allure"
    # Font size approximatif pour text-6xl (96px) et md:text-8xl (128px)
    # On va utiliser 96px pour desktop standard
    font_size_px = 96
    text = "allure"

    print(f"\n2. ANALYSE DU TEXTE")
    print(f"   Texte: '{text}'")
    print(f"   Police: Branch")
    print(f"   Taille: {font_size_px}px (text-6xl)")

    try:
        text_width = measure_text_width(text, font_path, font_size_px)
        print(f"   Largeur mesurée: {text_width:.2f}px")
    except:
        # Estimation si on ne peut pas charger la police
        text_width = font_size_px * len(text) * 0.55  # Estimation pour Branch
        print(f"   Largeur estimée: {text_width:.2f}px (police non chargée)")

    # 3. Calculer la largeur totale de l'ensemble
    total_width = display_logo_width + text_width - overlap_px

    print(f"\n3. ENSEMBLE LOGO + TEXTE")
    print(f"   Largeur logo: {display_logo_width}px")
    print(f"   + Largeur texte: {text_width:.2f}px")
    print(f"   - Overlap (charte): {overlap_px}px")
    print(f"   = Largeur totale: {total_width:.2f}px")

    # 4. Calculer le centre de masse visuel
    # Le centre du logo visuel est décalé par les marges asymétriques
    logo_visual_center = left_margin_display + (visual_content_width_display / 2)

    # Le texte commence à (logo_width - overlap)
    text_start = display_logo_width - overlap_px
    text_visual_center = text_start + (text_width / 2)

    # Centre de masse pondéré (on suppose poids égal logo/texte)
    # Pour un poids visuel égal: (centre_logo + centre_texte) / 2
    visual_mass_center = (logo_visual_center + text_visual_center) / 2

    print(f"\n4. CALCUL DU CENTRE DE MASSE VISUEL")
    print(f"   Centre visuel du logo: {logo_visual_center:.2f}px (depuis bord gauche du logo)")
    print(f"   Début du texte: {text_start}px")
    print(f"   Centre visuel du texte: {text_visual_center:.2f}px (depuis bord gauche du logo)")
    print(f"   Centre de masse total: {visual_mass_center:.2f}px")

    # 5. Calculer le décalage nécessaire
    # Le centre de l'écran devrait être au centre de masse visuel
    # Donc on décale tout de -visual_mass_center pour que ce point soit à x=0
    offset_needed = -visual_mass_center

    print(f"\n5. DÉCALAGE NÉCESSAIRE")
    print(f"   Pour centrer le centre de masse visuel à x=0:")
    print(f"   marginLeft: {offset_needed:.2f}px")

    print(f"\n" + "=" * 70)
    print(f"RÉSULTAT FINAL")
    print(f"=" * 70)
    print(f"CSS à appliquer sur le container:")
    print(f"   style={{ marginLeft: '{offset_needed:.2f}px' }}")
    print(f"=" * 70)

    return offset_needed

if __name__ == '__main__':
    logo_path = 'frontend/public/chatgpt-runner-mono.png'
    font_path = 'frontend/app/fonts/Branch.otf'

    offset = calculate_visual_center(logo_path, font_path)
