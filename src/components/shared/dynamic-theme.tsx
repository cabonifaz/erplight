'use client'

import { useEffect } from 'react';
import { FastAverageColor } from 'fast-average-color';
import { colord } from 'colord';

export function DynamicTheme({ logoUrl }: { logoUrl: string }) {
    useEffect(() => {
        if (!logoUrl) return;

        const fac = new FastAverageColor();

        fac.getColorAsync(logoUrl)
            .then(color => {
                const dominantHex = color.hex;
                const c = colord(dominantHex);
                
                // 1. Convertir a HSL para compatibilidad con Shadcn UI
                const hslColor = c.toHsl();
                const shadcnHslString = `${hslColor.h} ${hslColor.s}% ${hslColor.l}%`;

                // 2. Evaluar el contraste para el texto de los botones
                // Si el color es muy claro, el texto debe ser oscuro, y viceversa
                const isLight = c.isLight();
                const foregroundHslString = isLight ? '0 0% 9%' : '0 0% 98%';

                // 3. Inyectar las variables CSS en la raíz del documento
                document.documentElement.style.setProperty('--primary', shadcnHslString);
                document.documentElement.style.setProperty('--primary-foreground', foregroundHslString);
                document.documentElement.style.setProperty('--ring', shadcnHslString);
            })
            .catch(error => {
                console.error("Error al procesar el color del logo:", error);
            });

        return () => fac.destroy();
    }, [logoUrl]);

    return null;
}