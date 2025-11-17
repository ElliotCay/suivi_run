#!/usr/bin/env python3
"""
Calcule l'offset nécessaire pour centrer l'écart entre deux boutons de largeurs différentes.
"""

from PIL import Image, ImageDraw, ImageFont

def measure_text_width(text, font_path, font_size):
    """Mesure la largeur du texte."""
    try:
        img = Image.new('RGBA', (1000, 100), (255, 255, 255, 0))
        draw = ImageDraw.Draw(img)
        font = ImageFont.truetype(font_path, font_size)
        bbox = draw.textbbox((0, 0), text, font=font)
        return bbox[2] - bbox[0]
    except Exception as e:
        print(f"Erreur: {e}")
        return font_size * len(text) * 0.6

def calculate_button_widths():
    """
    Calcule les largeurs des boutons et l'offset pour centrer l'écart.

    Boutons:
    - text-xl (20px) + px-12 (48px padding de chaque côté)
    - Icône: h-5 w-5 (20px) + mr-3 (12px)
    """

    font_path = 'frontend/app/fonts/GeistVF.woff'  # Essayer avec Geist
    font_size = 20  # text-xl

    # Padding horizontal pour chaque bouton
    padding_x = 48  # px-12 = 3rem = 48px

    # Icône + margin
    icon_width = 20  # h-5 w-5
    icon_margin = 12  # mr-3

    print("=" * 70)
    print("CALCUL CENTRAGE BOUTONS CTA")
    print("=" * 70)

    # Bouton 1: "Connecter Strava"
    text1 = "Connecter Strava"
    # Approximation pour la largeur du texte (sans police web)
    text1_width = len(text1) * font_size * 0.55  # Estimation
    button1_width = padding_x + icon_width + icon_margin + text1_width + padding_x

    print(f"\n1. BOUTON GAUCHE: '{text1}'")
    print(f"   Padding gauche: {padding_x}px")
    print(f"   Icône: {icon_width}px")
    print(f"   Margin icône: {icon_margin}px")
    print(f"   Texte (estimé): {text1_width:.2f}px")
    print(f"   Padding droit: {padding_x}px")
    print(f"   Largeur totale: {button1_width:.2f}px")

    # Bouton 2: "Découvrir"
    text2 = "Découvrir"
    text2_width = len(text2) * font_size * 0.55
    button2_width = padding_x + icon_width + icon_margin + text2_width + padding_x

    print(f"\n2. BOUTON DROIT: '{text2}'")
    print(f"   Padding gauche: {padding_x}px")
    print(f"   Icône: {icon_width}px")
    print(f"   Margin icône: {icon_margin}px")
    print(f"   Texte (estimé): {text2_width:.2f}px")
    print(f"   Padding droit: {padding_x}px")
    print(f"   Largeur totale: {button2_width:.2f}px")

    # Gap entre les boutons
    gap = 64  # gap-16 = 4rem = 64px

    print(f"\n3. CONFIGURATION ACTUELLE")
    print(f"   Gap (gap-16): {gap}px")
    print(f"   Largeur totale: {button1_width + gap + button2_width:.2f}px")

    # Avec justify-center, le container centre l'ensemble
    # Le centre de l'écran devrait être au milieu du gap
    # Actuellement, le centre de l'ensemble est à (button1_width + gap/2 + button2_width) / 2

    # Position du bord droit du bouton 1 depuis le début du container
    button1_end = button1_width

    # Position du bord gauche du bouton 2 depuis le début du container
    button2_start = button1_width + gap

    # Centre de l'écart (milieu du gap)
    gap_center = button1_width + (gap / 2)

    # Centre de l'ensemble des deux boutons + gap
    total_width = button1_width + gap + button2_width
    ensemble_center = total_width / 2

    print(f"\n4. ANALYSE DU CENTRAGE")
    print(f"   Fin du bouton 1: {button1_end:.2f}px")
    print(f"   Début du bouton 2: {button2_start:.2f}px")
    print(f"   Centre du gap: {gap_center:.2f}px")
    print(f"   Centre de l'ensemble: {ensemble_center:.2f}px")

    # Offset nécessaire pour que le centre du gap soit au centre de l'écran
    # Si justify-center centre l'ensemble, on doit décaler
    offset = gap_center - ensemble_center

    print(f"\n5. DÉCALAGE NÉCESSAIRE")
    print(f"   Différence: {offset:.2f}px")

    if abs(offset) < 1:
        print(f"   Le centrage est déjà correct !")
    else:
        print(f"   Ajouter marginLeft: '{offset:.2f}px' sur le container des boutons")

    print(f"\n" + "=" * 70)
    print(f"RÉSULTAT:")
    if abs(offset) >= 1:
        print(f"Ajouter style={{ marginLeft: '{offset:.2f}px' }} au container motion.div")
    else:
        print(f"Le centrage visuel est déjà bon avec justify-center")
    print(f"=" * 70)

    return offset

if __name__ == '__main__':
    calculate_button_widths()
