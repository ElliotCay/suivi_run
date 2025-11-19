import React from 'react';

export default function TypographyTestPage() {
    return (
        <div className="space-y-12 py-12">
            <div className="space-y-4">
                <h1 className="font-serif text-6xl">Typography System</h1>
                <p className="text-xl text-muted-foreground">
                    Testing the new font stack: <span className="font-bold text-foreground">Outfit</span> (Sans) & <span className="font-serif text-foreground">Magilio</span> (Serif)
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Sans Serif Section (Outfit) */}
                <div className="space-y-8">
                    <div className="border-b pb-2">
                        <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">Primary Font (Outfit)</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Display / H1</p>
                            <h1 className="text-5xl font-bold tracking-tight">Ready to Run.</h1>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Heading / H2</p>
                            <h2 className="text-3xl font-semibold">Weekly Summary</h2>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Body / Regular</p>
                            <p className="leading-relaxed text-muted-foreground">
                                Running is a method of terrestrial locomotion allowing humans and other animals to move rapidly on foot. It is a type of gait characterized by an aerial phase in which all feet are above the ground (though there are exceptions).
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">UI / Label</p>
                            <div className="flex gap-4">
                                <span className="text-sm font-medium uppercase tracking-wider bg-secondary px-3 py-1 rounded-full">Distance</span>
                                <span className="text-sm font-medium uppercase tracking-wider bg-secondary px-3 py-1 rounded-full">Pace</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Serif Section (Magilio) */}
                <div className="space-y-8">
                    <div className="border-b pb-2">
                        <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">Accent Font (Magilio)</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Display / H1</p>
                            <h1 className="font-serif text-6xl">Allure.</h1>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Heading / H2</p>
                            <h2 className="font-serif text-4xl">Le Marathon</h2>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Quote / Emphasis</p>
                            <blockquote className="font-serif text-2xl italic leading-relaxed border-l-2 pl-6 border-primary/20">
                                "The miracle isn't that I finished. The miracle is that I had the courage to start."
                            </blockquote>
                        </div>
                    </div>
                </div>

                {/* Mono Section (JetBrains Mono) */}
                <div className="space-y-8">
                    <div className="border-b pb-2">
                        <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">Data / Metrics (JetBrains Mono)</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Static Data (Regular)</p>
                            <div className="font-mono text-5xl">10:24 / 10:24</div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Dynamic Data (Italic - Speed Effect)</p>
                            <div className="font-mono italic text-5xl text-primary">10:24 / 10:24</div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Code / Technical</p>
                            <div className="font-mono text-sm bg-muted p-4 rounded-md">
                                {"{ current_pace: '4:30', heart_rate: 145 }"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logo Test */}
            <div className="pt-12 border-t">
                <div className="border-b pb-2 mb-8">
                    <h2 className="text-sm uppercase tracking-widest text-muted-foreground font-semibold">Brand Identity</h2>
                </div>
                <div className="flex items-center gap-12">
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">Logo Font (Branch) - Homepage Style</p>
                        <span className="font-[family-name:var(--font-branch)] text-6xl">allure</span>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">Context</p>
                        <div className="flex items-baseline gap-4">
                            <span className="font-[family-name:var(--font-branch)] text-4xl">allure</span>
                            <span className="font-serif text-xl text-muted-foreground">Running Coach</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
