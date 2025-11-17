#!/usr/bin/env python3
"""
Analyse le logo pour calculer les espaces vides à gauche et à droite
et déterminer l'offset nécessaire pour centrer visuellement l'ensemble.
"""

from PIL import Image
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
            if a > 10:  # Pixel non-transparent
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
            if a > 10:  # Pixel non-transparent
                has_content = True
                break
        if has_content:
            right_margin = width - 1 - x
            break

    # Calculer le déséquilibre
    imbalance = right_margin - left_margin
    compensation = imbalance / 2

    print(f"Analyse du logo: {image_path}")
    print(f"Dimensions: {width}x{height}px")
    print(f"Marge gauche (blanc): {left_margin}px")
    print(f"Marge droite (blanc): {right_margin}px")
    print(f"Déséquilibre: {imbalance}px (plus de blanc à {'droite' if imbalance > 0 else 'gauche'})")
    print(f"Compensation recommandée: {compensation}px vers la {'gauche' if imbalance > 0 else 'droite'}")
    print(f"\nCSS marginLeft: '{-compensation}px'")

    return {
        'width': width,
        'height': height,
        'left_margin': left_margin,
        'right_margin': right_margin,
        'imbalance': imbalance,
        'compensation': compensation
    }

if __name__ == '__main__':
    logo_path = 'frontend/public/chatgpt-runner-mono.png'
    analyze_logo(logo_path)
